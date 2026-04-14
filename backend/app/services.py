from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
import secrets

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Contact, EventType, Meeting, User
from app.schemas import (
    AnalyticsResponse,
    AvailabilityPayload,
    AvailabilityRuleItem,
    AvailabilityOverrideItem,
    BookingConfirmationResponse,
    ContactResponse,
    DashboardResponse,
    EventTypeResponse,
    IntegrationResponse,
    MeetingResponse,
    PublicEventResponse,
    PublicSlotResponse,
    UserSummary,
    WorkflowResponse,
)


def get_default_user(db: Session) -> User:
    user = db.scalar(select(User).limit(1))
    if not user:
        raise HTTPException(status_code=404, detail="Default user not found")
    return user


def build_public_url(slug: str) -> str:
    return f"/book/{slug}"


def serialize_event_type(event_type: EventType) -> EventTypeResponse:
    return EventTypeResponse.model_validate(
        {
            "id": event_type.id,
            "name": event_type.name,
            "slug": event_type.slug,
            "description": event_type.description,
            "color": event_type.color,
            "location": event_type.location,
            "duration_minutes": event_type.duration_minutes,
            "is_active": event_type.is_active,
            "buffer_before_minutes": event_type.buffer_before_minutes,
            "buffer_after_minutes": event_type.buffer_after_minutes,
            "public_url": build_public_url(event_type.slug),
        }
    )


def serialize_meeting(meeting: Meeting) -> MeetingResponse:
    return MeetingResponse(
        id=meeting.id,
        invitee_name=meeting.invitee_name,
        invitee_email=meeting.invitee_email,
        starts_at=meeting.starts_at,
        ends_at=meeting.ends_at,
        status=meeting.status,
        notes=meeting.notes,
        cancellation_reason=meeting.cancellation_reason,
        confirmation_code=meeting.confirmation_code,
        event_type_name=meeting.event_type.name,
        event_type_slug=meeting.event_type.slug,
    )


def availability_payload(user: User) -> AvailabilityPayload:
    return AvailabilityPayload(
        timezone=user.timezone,
        rules=[
            AvailabilityRuleItem(
                weekday=rule.weekday,
                is_available=rule.is_available,
                start_time=rule.start_time,
                end_time=rule.end_time,
            )
            for rule in sorted(user.availability_rules, key=lambda item: item.weekday)
        ],
        overrides=[
            AvailabilityOverrideItem(
                id=item.id,
                date=item.date,
                is_available=item.is_available,
                start_time=item.start_time,
                end_time=item.end_time,
                label=item.label,
            )
            for item in sorted(user.availability_overrides, key=lambda entry: entry.date)
        ],
    )


def analytics_payload(user: User) -> AnalyticsResponse:
    meetings = list(user.meetings)
    created_events = len(meetings)
    completed_events = len([meeting for meeting in meetings if meeting.status == "completed"])
    rescheduled_events = len([meeting for meeting in meetings if meeting.status == "rescheduled"])
    cancelled_events = len([meeting for meeting in meetings if meeting.status == "cancelled"])

    event_counter = Counter(meeting.event_type.name for meeting in meetings)
    duration_counter = Counter(meeting.event_type.duration_minutes for meeting in meetings)
    trend_counter: dict[str, int] = defaultdict(int)
    weekday_counter: dict[str, int] = defaultdict(int)

    for meeting in meetings:
        trend_counter[meeting.starts_at.date().isoformat()] += 1
        weekday_counter[meeting.starts_at.strftime("%A")] += 1

    return AnalyticsResponse(
        created_events=created_events,
        completed_events=completed_events,
        rescheduled_events=rescheduled_events,
        cancelled_events=cancelled_events,
        popular_event_types=[{"label": label, "value": value} for label, value in event_counter.most_common(5)],
        trend=[{"date": key, "value": value} for key, value in sorted(trend_counter.items())],
        duration_breakdown=[{"label": f"{key} min", "value": value} for key, value in sorted(duration_counter.items())],
        weekday_heatmap=[{"label": key, "value": value} for key, value in weekday_counter.items()],
    )


def dashboard_payload(db: Session) -> DashboardResponse:
    user = get_default_user(db)
    meetings = sorted(user.meetings, key=lambda meeting: meeting.starts_at, reverse=True)
    analytics = analytics_payload(user)

    return DashboardResponse(
        user=UserSummary.model_validate(user),
        stats={
            "active_event_types": len([item for item in user.event_types if item.is_active]),
            "upcoming_meetings": len([meeting for meeting in user.meetings if meeting.status in {"scheduled", "rescheduled"}]),
            "total_contacts": len(user.contacts),
            "active_workflows": len([workflow for workflow in user.workflows if workflow.is_enabled]),
        },
        event_types=[serialize_event_type(event_type) for event_type in sorted(user.event_types, key=lambda item: item.created_at)],
        meetings=[serialize_meeting(meeting) for meeting in meetings],
        contacts=[ContactResponse.model_validate(contact) for contact in user.contacts],
        workflows=[WorkflowResponse.model_validate(workflow) for workflow in user.workflows],
        integrations=[IntegrationResponse.model_validate(integration) for integration in user.integrations],
        availability=availability_payload(user),
        analytics=analytics,
    )


def ensure_unique_slug(db: Session, slug: str, exclude_id: int | None = None) -> None:
    existing = db.scalar(select(EventType).where(EventType.slug == slug))
    if existing and existing.id != exclude_id:
        raise HTTPException(status_code=400, detail="Slug already exists")


def get_event_type_by_slug(db: Session, slug: str) -> EventType:
    event_type = db.scalar(select(EventType).where(EventType.slug == slug))
    if not event_type:
        raise HTTPException(status_code=404, detail="Event type not found")
    return event_type


def get_event_type_by_id(db: Session, event_type_id: int) -> EventType:
    event_type = db.get(EventType, event_type_id)
    if not event_type:
        raise HTTPException(status_code=404, detail="Event type not found")
    return event_type


def generate_slots(db: Session, event_type: EventType, target_date: date) -> list[dict]:
    tz = ZoneInfo(event_type.user.timezone)
    override = next((item for item in event_type.user.availability_overrides if item.date == target_date), None)

    if override:
        if not override.is_available or not override.start_time or not override.end_time:
            return []
        start_time = override.start_time
        end_time = override.end_time
    else:
        weekday_rule = next((item for item in event_type.user.availability_rules if item.weekday == target_date.weekday()), None)
        if not weekday_rule or not weekday_rule.is_available or not weekday_rule.start_time or not weekday_rule.end_time:
            return []
        start_time = weekday_rule.start_time
        end_time = weekday_rule.end_time

    start_local = datetime.combine(target_date, start_time, tzinfo=tz)
    end_local = datetime.combine(target_date, end_time, tzinfo=tz)
    current = start_local
    duration = timedelta(minutes=event_type.duration_minutes)
    buffer_before = timedelta(minutes=event_type.buffer_before_minutes)
    buffer_after = timedelta(minutes=event_type.buffer_after_minutes)
    now_local = datetime.now(tz)

    existing_meetings = db.scalars(
        select(Meeting).where(
            Meeting.user_id == event_type.user_id,
            Meeting.status.in_(["scheduled", "rescheduled", "completed"]),
        )
    ).all()

    slots: list[dict] = []
    while current + duration <= end_local:
        candidate_end = current + duration
        overlaps = False
        for meeting in existing_meetings:
            meeting_start = meeting.starts_at.replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
            meeting_end = meeting.ends_at.replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)
            if current - buffer_before < meeting_end and candidate_end + buffer_after > meeting_start:
                overlaps = True
                break

        slots.append(
            {
                "label": current.strftime("%I:%M %p").lstrip("0").lower(),
                "value": current.strftime("%H:%M"),
                "available": current > now_local and not overlaps,
            }
        )
        current += duration

    return [slot for slot in slots if slot["available"]]


def available_dates(db: Session, event_type: EventType, month_anchor: date) -> list[date]:
    month_start = month_anchor.replace(day=1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    total_days = (next_month - month_start).days
    dates: list[date] = []
    for offset in range(total_days):
        current_date = month_start + timedelta(days=offset)
        if generate_slots(db, event_type, current_date):
            dates.append(current_date)
    return dates


def public_event_payload(db: Session, slug: str, month_anchor: date | None = None) -> PublicEventResponse:
    event_type = get_event_type_by_slug(db, slug)
    anchor = month_anchor or datetime.now(ZoneInfo(event_type.user.timezone)).date().replace(day=1)
    return PublicEventResponse(
        host=UserSummary.model_validate(event_type.user),
        event_type=serialize_event_type(event_type),
        timezone=event_type.user.timezone,
        month_anchor=anchor,
        highlighted_dates=available_dates(db, event_type, anchor),
    )


def public_slots_payload(db: Session, slug: str, target_date: date) -> PublicSlotResponse:
    event_type = get_event_type_by_slug(db, slug)
    return PublicSlotResponse(date=target_date, slots=generate_slots(db, event_type, target_date))


def create_booking(
    db: Session,
    slug: str,
    target_date: date,
    time_value: str,
    invitee_name: str,
    invitee_email: str,
    notes: str,
) -> BookingConfirmationResponse:
    event_type = get_event_type_by_slug(db, slug)
    tz = ZoneInfo(event_type.user.timezone)
    slot_start_time = datetime.strptime(time_value, "%H:%M").time()
    slot_start_local = datetime.combine(target_date, slot_start_time, tzinfo=tz)
    slot_end_local = slot_start_local + timedelta(minutes=event_type.duration_minutes)

    valid_slots = {slot["value"] for slot in generate_slots(db, event_type, target_date)}
    if time_value not in valid_slots:
        raise HTTPException(status_code=409, detail="Selected slot is no longer available")

    meeting = Meeting(
        user_id=event_type.user_id,
        event_type_id=event_type.id,
        invitee_name=invitee_name,
        invitee_email=invitee_email,
        starts_at=slot_start_local.astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
        ends_at=slot_end_local.astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
        status="scheduled",
        notes=notes,
        confirmation_code=secrets.token_hex(8),
    )
    db.add(meeting)
    db.flush()

    contact = db.scalar(
        select(Contact).where(Contact.user_id == event_type.user_id, Contact.email == invitee_email)
    )
    if not contact:
        db.add(
            Contact(
                user_id=event_type.user_id,
                name=invitee_name,
                email=invitee_email,
                company="Independent",
                job_title="Guest",
                last_meeting_at=meeting.starts_at,
            )
        )
    else:
        contact.name = invitee_name
        contact.last_meeting_at = meeting.starts_at

    db.commit()
    db.refresh(meeting)
    return BookingConfirmationResponse(
        id=meeting.id,
        confirmation_code=meeting.confirmation_code,
        invitee_name=meeting.invitee_name,
        invitee_email=meeting.invitee_email,
        event_type_name=meeting.event_type.name,
        location=meeting.event_type.location,
        starts_at=meeting.starts_at,
        ends_at=meeting.ends_at,
        timezone=event_type.user.timezone,
    )


def get_confirmation_by_code(db: Session, confirmation_code: str) -> BookingConfirmationResponse:
    meeting = db.scalar(
        select(Meeting).where(Meeting.confirmation_code == confirmation_code)
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Confirmation not found")

    return BookingConfirmationResponse(
        id=meeting.id,
        confirmation_code=meeting.confirmation_code,
        invitee_name=meeting.invitee_name,
        invitee_email=meeting.invitee_email,
        event_type_name=meeting.event_type.name,
        location=meeting.event_type.location,
        starts_at=meeting.starts_at,
        ends_at=meeting.ends_at,
        timezone=meeting.event_type.user.timezone,
    )
