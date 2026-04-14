from datetime import timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import AvailabilityOverride, AvailabilityRule, EventType, Meeting, User, Workflow
from app.schemas import (
    AvailabilityPayload,
    DashboardResponse,
    EventTypeCreate,
    EventTypeResponse,
    EventTypeUpdate,
    MeetingCancelRequest,
    MeetingRescheduleRequest,
    MeetingResponse,
    WorkflowCreate,
    WorkflowResponse,
)
from app.services import (
    availability_payload,
    dashboard_payload,
    ensure_unique_slug,
    get_default_user,
    get_event_type_by_id,
    serialize_event_type,
    serialize_meeting,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    return dashboard_payload(db)


@router.get("/event-types", response_model=list[EventTypeResponse])
def list_event_types(db: Session = Depends(get_db)):
    user = get_default_user(db)
    return [serialize_event_type(event_type) for event_type in sorted(user.event_types, key=lambda item: item.created_at)]


@router.post("/event-types", response_model=EventTypeResponse)
def create_event_type(payload: EventTypeCreate, db: Session = Depends(get_db)):
    user = get_default_user(db)
    ensure_unique_slug(db, payload.slug)
    event_type = EventType(user_id=user.id, **payload.model_dump())
    db.add(event_type)
    db.commit()
    db.refresh(event_type)
    return serialize_event_type(event_type)


@router.put("/event-types/{event_type_id}", response_model=EventTypeResponse)
def update_event_type(event_type_id: int, payload: EventTypeUpdate, db: Session = Depends(get_db)):
    event_type = get_event_type_by_id(db, event_type_id)
    ensure_unique_slug(db, payload.slug, exclude_id=event_type_id)
    for key, value in payload.model_dump().items():
        setattr(event_type, key, value)
    db.commit()
    db.refresh(event_type)
    return serialize_event_type(event_type)


@router.delete("/event-types/{event_type_id}")
def delete_event_type(event_type_id: int, db: Session = Depends(get_db)):
    event_type = get_event_type_by_id(db, event_type_id)
    db.delete(event_type)
    db.commit()
    return {"ok": True}


@router.get("/availability", response_model=AvailabilityPayload)
def get_availability(db: Session = Depends(get_db)):
    user = db.scalar(
        select(User).options(
            selectinload(User.availability_rules),
            selectinload(User.availability_overrides),
        ).limit(1)
    )
    return availability_payload(user)


@router.put("/availability", response_model=AvailabilityPayload)
def update_availability(payload: AvailabilityPayload, db: Session = Depends(get_db)):
    user = get_default_user(db)
    user.timezone = payload.timezone

    for rule in list(user.availability_rules):
        db.delete(rule)
    for item in payload.rules:
        db.add(
            AvailabilityRule(
                user_id=user.id,
                weekday=item.weekday,
                is_available=item.is_available,
                start_time=item.start_time,
                end_time=item.end_time,
            )
        )

    for override in list(user.availability_overrides):
        db.delete(override)
    for item in payload.overrides:
        db.add(
            AvailabilityOverride(
                user_id=user.id,
                date=item.date,
                is_available=item.is_available,
                start_time=item.start_time,
                end_time=item.end_time,
                label=item.label,
            )
        )

    db.commit()
    db.refresh(user)
    return availability_payload(user)


@router.get("/meetings", response_model=list[MeetingResponse])
def list_meetings(db: Session = Depends(get_db)):
    meetings = db.scalars(
        select(Meeting).options(
            selectinload(Meeting.event_type).selectinload(EventType.user)
        ).order_by(Meeting.starts_at.desc())
    ).all()
    return [serialize_meeting(meeting) for meeting in meetings]


@router.post("/meetings/{meeting_id}/cancel", response_model=MeetingResponse)
def cancel_meeting(meeting_id: int, payload: MeetingCancelRequest, db: Session = Depends(get_db)):
    meeting = db.scalar(select(Meeting).options(selectinload(Meeting.event_type)).where(Meeting.id == meeting_id))
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    meeting.status = "cancelled"
    meeting.cancellation_reason = payload.reason
    db.commit()
    db.refresh(meeting)
    return serialize_meeting(meeting)


@router.post("/meetings/{meeting_id}/reschedule", response_model=MeetingResponse)
def reschedule_meeting(meeting_id: int, payload: MeetingRescheduleRequest, db: Session = Depends(get_db)):
    meeting = db.scalar(
        select(Meeting).options(
            selectinload(Meeting.event_type).selectinload(EventType.user)
        ).where(Meeting.id == meeting_id)
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    duration = meeting.ends_at - meeting.starts_at
    tz = ZoneInfo(meeting.event_type.user.timezone)
    requested_start = payload.starts_at.replace(tzinfo=tz) if payload.starts_at.tzinfo is None else payload.starts_at.astimezone(tz)
    meeting.starts_at = requested_start.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    meeting.ends_at = (requested_start + duration).astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    meeting.status = "rescheduled"
    db.commit()
    db.refresh(meeting)
    return serialize_meeting(meeting)


@router.post("/workflows", response_model=WorkflowResponse)
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)):
    user = get_default_user(db)
    workflow = Workflow(user_id=user.id, **payload.model_dump(), is_enabled=True)
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return WorkflowResponse.model_validate(workflow)
