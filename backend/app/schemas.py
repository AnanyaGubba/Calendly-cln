from datetime import date, datetime, time

from pydantic import BaseModel, EmailStr, Field


class UserSummary(BaseModel):
    id: int
    name: str
    email: str
    title: str
    timezone: str
    avatar_initials: str
    bio: str

    model_config = {"from_attributes": True}


class EventTypeBase(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    slug: str = Field(min_length=2, max_length=160)
    description: str = ""
    color: str = "#7c5cff"
    location: str = "Google Meet"
    duration_minutes: int = Field(ge=15, le=240)
    is_active: bool = True
    buffer_before_minutes: int = Field(default=0, ge=0, le=120)
    buffer_after_minutes: int = Field(default=0, ge=0, le=120)


class EventTypeCreate(EventTypeBase):
    pass


class EventTypeUpdate(EventTypeBase):
    pass


class EventTypeResponse(EventTypeBase):
    id: int
    public_url: str

    model_config = {"from_attributes": True}


class AvailabilityRuleItem(BaseModel):
    weekday: int
    is_available: bool
    start_time: time | None = None
    end_time: time | None = None


class AvailabilityOverrideItem(BaseModel):
    id: int | None = None
    date: date
    is_available: bool
    start_time: time | None = None
    end_time: time | None = None
    label: str = ""


class AvailabilityPayload(BaseModel):
    timezone: str
    rules: list[AvailabilityRuleItem]
    overrides: list[AvailabilityOverrideItem]


class ContactResponse(BaseModel):
    id: int
    name: str
    email: str
    company: str
    job_title: str
    last_meeting_at: datetime | None

    model_config = {"from_attributes": True}


class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: str
    trigger_type: str
    is_enabled: bool

    model_config = {"from_attributes": True}


class IntegrationResponse(BaseModel):
    id: int
    name: str
    category: str
    description: str
    status: str

    model_config = {"from_attributes": True}


class MeetingResponse(BaseModel):
    id: int
    invitee_name: str
    invitee_email: str
    starts_at: datetime
    ends_at: datetime
    status: str
    notes: str
    cancellation_reason: str
    confirmation_code: str
    event_type_name: str
    event_type_slug: str


class MeetingCancelRequest(BaseModel):
    reason: str = ""


class MeetingRescheduleRequest(BaseModel):
    starts_at: datetime


class AnalyticsResponse(BaseModel):
    created_events: int
    completed_events: int
    rescheduled_events: int
    cancelled_events: int
    popular_event_types: list[dict]
    trend: list[dict]
    duration_breakdown: list[dict]
    weekday_heatmap: list[dict]


class DashboardResponse(BaseModel):
    user: UserSummary
    stats: dict
    event_types: list[EventTypeResponse]
    meetings: list[MeetingResponse]
    contacts: list[ContactResponse]
    workflows: list[WorkflowResponse]
    integrations: list[IntegrationResponse]
    availability: AvailabilityPayload
    analytics: AnalyticsResponse


class PublicEventResponse(BaseModel):
    host: UserSummary
    event_type: EventTypeResponse
    timezone: str
    month_anchor: date
    highlighted_dates: list[date]


class PublicSlotResponse(BaseModel):
    date: date
    slots: list[dict]


class BookingRequest(BaseModel):
    date: date
    time: str
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    notes: str = ""


class BookingConfirmationResponse(BaseModel):
    id: int
    confirmation_code: str
    invitee_name: str
    invitee_email: str
    event_type_name: str
    location: str
    starts_at: datetime
    ends_at: datetime
    timezone: str


class WorkflowCreate(BaseModel):
    name: str
    description: str
    trigger_type: str
