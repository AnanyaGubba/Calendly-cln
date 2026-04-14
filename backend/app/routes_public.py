from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import BookingConfirmationResponse, BookingRequest, PublicEventResponse, PublicSlotResponse
from app.services import create_booking, get_confirmation_by_code, public_event_payload, public_slots_payload

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/{slug}", response_model=PublicEventResponse)
def get_public_event(slug: str, month: date | None = None, db: Session = Depends(get_db)):
    return public_event_payload(db, slug, month_anchor=month)


@router.get("/{slug}/slots", response_model=PublicSlotResponse)
def get_public_slots(slug: str, date: date, db: Session = Depends(get_db)):
    return public_slots_payload(db, slug, target_date=date)


@router.post("/{slug}/book", response_model=BookingConfirmationResponse)
def book_slot(slug: str, payload: BookingRequest, db: Session = Depends(get_db)):
    return create_booking(
        db,
        slug=slug,
        target_date=payload.date,
        time_value=payload.time,
        invitee_name=payload.name,
        invitee_email=payload.email,
        notes=payload.notes,
    )


@router.get("/confirmations/{confirmation_code}", response_model=BookingConfirmationResponse)
def get_confirmation(confirmation_code: str, db: Session = Depends(get_db)):
    return get_confirmation_by_code(db, confirmation_code)
