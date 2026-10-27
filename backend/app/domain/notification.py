"""Sanitized notification intent metadata, separate from delivery mechanisms."""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from hashlib import sha256

from app.domain.extraction import ProviderExtractionError


class NotificationEventType(StrEnum):
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class NotificationChannel(StrEnum):
    SLACK = "SLACK"


class NotificationStatus(StrEnum):
    PENDING = "PENDING"


SAFE_ERROR_CODES = ProviderExtractionError.CODES | {"EXTRACTION_FAILED"}


@dataclass(frozen=True)
class NotificationIntent:
    triage_id: str
    event_type: NotificationEventType
    channel: NotificationChannel
    status: NotificationStatus
    idempotency_key: str
    created_at: datetime
    error_code: str | None = None
    attempt_count: int = 0
    last_attempt_at: datetime | None = None
    delivered_at: datetime | None = None
    next_attempt_at: datetime | None = None


def review_required_intent(
    document_id: str,
    triage_id: str,
    created_at: datetime,
    error_code: str | None = None,
) -> NotificationIntent:
    event_type = NotificationEventType.REVIEW_REQUIRED
    idempotency_key = sha256(f"{document_id}\x00{event_type.value}".encode()).hexdigest()
    safe_error_code = None
    if error_code is not None:
        safe_error_code = error_code if error_code in SAFE_ERROR_CODES else "EXTRACTION_FAILED"
    return NotificationIntent(
        triage_id=triage_id,
        event_type=event_type,
        channel=NotificationChannel.SLACK,
        status=NotificationStatus.PENDING,
        idempotency_key=idempotency_key,
        created_at=created_at,
        error_code=safe_error_code,
    )
