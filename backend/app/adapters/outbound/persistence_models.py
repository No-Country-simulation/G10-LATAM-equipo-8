"""Relational persistence only; the domain remains independent of SQLAlchemy."""

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

JSON_VALUE = JSON(none_as_null=True).with_variant(JSONB(none_as_null=True), "postgresql")


class Base(DeclarativeBase):
    pass


class DocumentRow(Base):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint("size_bytes >= 0"),
        CheckConstraint("storage_state IN ('PENDING','READY','FAILED')"),
    )
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    public_id: Mapped[str] = mapped_column(String(128), unique=True)
    channel: Mapped[str] = mapped_column(String(100))
    media_type: Mapped[str] = mapped_column(String(100))
    original_filename: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    provider: Mapped[str] = mapped_column(String(40))
    bucket: Mapped[str | None] = mapped_column(String(100))
    object_key: Mapped[str] = mapped_column(Text, unique=True)
    storage_state: Mapped[str] = mapped_column(String(20))
    upload_token: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class TriageRow(Base):
    __tablename__ = "triages"
    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1"),
        CheckConstraint(
            "status IN ('PROCESSED','NEEDS_AUDIT','APPROVED','REJECTED')", name="ck_triages_status"
        ),
        CheckConstraint("priority IN ('Rutina','Urgente')", name="ck_triages_priority"),
        CheckConstraint("version > 0 AND schema_version > 0", name="ck_triages_version"),
        CheckConstraint(
            "processing_status IN ('PENDING','PROCESSING','SUCCEEDED','FAILED')",
            name="ck_triages_processing",
        ),
    )
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), unique=True)
    document_type: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[str | None] = mapped_column(String(20))
    confidence: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), index=True)
    destination: Mapped[str] = mapped_column(String(40), index=True)
    urgent_alert: Mapped[bool] = mapped_column(Boolean)
    extraction_original: Mapped[dict | None] = mapped_column(JSON_VALUE, nullable=True)
    extraction_current: Mapped[dict | None] = mapped_column(JSON_VALUE, nullable=True)
    processing_status: Mapped[str] = mapped_column(
        String(20), default="SUCCEEDED", server_default="SUCCEEDED"
    )
    processing_token: Mapped[str | None] = mapped_column(String(32))
    processing_lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    processing_error: Mapped[str | None] = mapped_column(String(60))
    provenance: Mapped[dict] = mapped_column(JSON_VALUE, default=dict, server_default="{}")
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ReviewRow(Base):
    __tablename__ = "review_events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    triage_id: Mapped[str] = mapped_column(ForeignKey("triages.id"), unique=True)
    action: Mapped[str] = mapped_column(String(30))
    reviewer: Mapped[str] = mapped_column(Text)
    comment: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    previous_status: Mapped[str] = mapped_column(String(30))
    new_status: Mapped[str] = mapped_column(String(30))
    previous_destination: Mapped[str] = mapped_column(String(40))
    new_destination: Mapped[str] = mapped_column(String(40))
    before: Mapped[dict] = mapped_column(JSON_VALUE)
    after: Mapped[dict] = mapped_column(JSON_VALUE)
    corrections: Mapped[list] = mapped_column(JSON_VALUE)


class NotificationOutboxRow(Base):
    __tablename__ = "notification_outbox"
    __table_args__ = (
        CheckConstraint("event_type = 'REVIEW_REQUIRED'", name="ck_notification_outbox_event"),
        CheckConstraint("channel = 'SLACK'", name="ck_notification_outbox_channel"),
        CheckConstraint("attempt_count >= 0", name="ck_notification_outbox_attempt_count"),
        UniqueConstraint("idempotency_key", name="uq_notification_outbox_idempotency"),
        UniqueConstraint("triage_id", "event_type", name="uq_notification_outbox_triage_event"),
    )
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    triage_id: Mapped[str] = mapped_column(ForeignKey("triages.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(60))
