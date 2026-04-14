from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AvailabilityOverride, AvailabilityRule, Contact, EventType, Integration, Meeting, User, Workflow


def seed_database(db: Session) -> None:
    if db.scalar(select(User).limit(1)):
        return

    user = User(
        name="Ananya Gubba",
        email="ananya@example.com",
        title="Software Engineer",
        timezone=settings.default_timezone,
        avatar_initials="A",
        bio="I help teams streamline hiring loops, discovery calls, and product syncs.",
    )
    db.add(user)
    db.flush()

    event_types = [
        EventType(
            user_id=user.id,
            name="30 Minute Meeting",
            slug="ananya-30min",
            description="A focused one-on-one for product reviews, interviews, or discovery calls.",
            color="#8b5cf6",
            duration_minutes=30,
            location="Google Meet",
            buffer_before_minutes=5,
            buffer_after_minutes=5,
        ),
        EventType(
            user_id=user.id,
            name="45 Minute Strategy Session",
            slug="ananya-strategy-session",
            description="Collaborative strategy meeting with room for prep and follow-up.",
            color="#2563eb",
            duration_minutes=45,
            location="Zoom",
            buffer_before_minutes=10,
            buffer_after_minutes=10,
        ),
        EventType(
            user_id=user.id,
            name="15 Minute Intro Call",
            slug="ananya-intro-call",
            description="Quick introduction for prospects or referrals.",
            color="#0f766e",
            duration_minutes=15,
            location="Phone Call",
        ),
    ]
    db.add_all(event_types)

    weekly_schedule = {
        0: (time(9, 0), time(17, 0)),
        1: (time(9, 0), time(17, 0)),
        2: (time(9, 0), time(17, 0)),
        3: (time(9, 0), time(17, 0)),
        4: (time(9, 0), time(17, 0)),
        5: (None, None),
        6: (None, None),
    }
    for weekday, range_pair in weekly_schedule.items():
        start, end = range_pair
        db.add(
            AvailabilityRule(
                user_id=user.id,
                weekday=weekday,
                is_available=bool(start and end),
                start_time=start,
                end_time=end,
            )
        )

    today = datetime.now(ZoneInfo(settings.default_timezone)).date()
    db.add_all(
        [
            AvailabilityOverride(
                user_id=user.id,
                date=today + timedelta(days=2),
                is_available=True,
                start_time=time(11, 0),
                end_time=time(15, 0),
                label="Workshop day",
            ),
            AvailabilityOverride(
                user_id=user.id,
                date=today + timedelta(days=5),
                is_available=False,
                start_time=None,
                end_time=None,
                label="Out of office",
            ),
        ]
    )

    tz = ZoneInfo(settings.default_timezone)
    future_slot = datetime.now(tz).replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)
    past_slot = future_slot - timedelta(days=3)
    rescheduled_slot = future_slot + timedelta(days=4)

    db.add_all(
        [
            Meeting(
                user_id=user.id,
                event_type=event_types[0],
                invitee_name="Daniel Jones",
                invitee_email="daniel@magnolia.com",
                starts_at=future_slot.astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
                ends_at=(future_slot + timedelta(minutes=30)).astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
                status="scheduled",
                notes="Discuss onboarding flow.",
                confirmation_code="conf1234abcd",
            ),
            Meeting(
                user_id=user.id,
                event_type=event_types[1],
                invitee_name="Miguel Padilla",
                invitee_email="miguel@wooly.com",
                starts_at=past_slot.astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
                ends_at=(past_slot + timedelta(minutes=45)).astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
                status="completed",
                notes="Quarterly roadmap planning.",
                confirmation_code="conf5678efgh",
            ),
            Meeting(
                user_id=user.id,
                event_type=event_types[0],
                invitee_name="Kathryn Irving",
                invitee_email="kathryn@magnolia.com",
                starts_at=rescheduled_slot.astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
                ends_at=(rescheduled_slot + timedelta(minutes=30)).astimezone(ZoneInfo("UTC")).replace(tzinfo=None),
                status="rescheduled",
                notes="Rescheduled from Monday.",
                confirmation_code="conf9012ijkl",
            ),
        ]
    )

    db.add_all(
        [
            Contact(user_id=user.id, name="Daniel Jones", email="daniel@magnolia.com", company="Magnolia", job_title="Account Executive"),
            Contact(user_id=user.id, name="Kathryn Irving", email="kathryn@magnolia.com", company="Magnolia", job_title="Senior Recruiter"),
            Contact(user_id=user.id, name="Miguel Padilla", email="miguel@wooly.com", company="Wooly", job_title="Marketing Lead"),
            Contact(user_id=user.id, name="Michael Mendez", email="michael@wooly.com", company="Wooly", job_title="Customer Success"),
        ]
    )

    db.add_all(
        [
            Workflow(user_id=user.id, name="Email reminder to invitee", description="Reduce no-shows with a reminder 24 hours before the meeting.", trigger_type="email"),
            Workflow(user_id=user.id, name="Text cancellation notification to host", description="Notify the host instantly when an invitee cancels.", trigger_type="sms"),
            Workflow(user_id=user.id, name="Send thank you email", description="Follow up after meetings with a short thank-you note.", trigger_type="email"),
        ]
    )

    db.add_all(
        [
            Integration(user_id=user.id, name="Zoom", category="Video", description="Include Zoom details in your events.", status="available"),
            Integration(user_id=user.id, name="Google Meet", category="Video", description="Include Google Meet details in your events.", status="connected"),
            Integration(user_id=user.id, name="Google Calendar", category="Calendar", description="Prevent double-booking with synced calendar events.", status="connected"),
            Integration(user_id=user.id, name="HubSpot", category="CRM", description="Sync meetings into your CRM pipeline.", status="available"),
            Integration(user_id=user.id, name="Slack", category="Messaging", description="Share meeting links with your team in Slack.", status="available"),
            Integration(user_id=user.id, name="Stripe", category="Payments", description="Collect payments before your meeting.", status="available"),
        ]
    )

    db.commit()
