"""Committed upload reservations, then transactional finalization and human review."""

from collections.abc import Callable
from dataclasses import asdict
from datetime import UTC, datetime
from hashlib import sha256
from uuid import uuid4

from sqlalchemy import Engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.adapters.outbound.persistence_models import DocumentRow, ReviewRow, TriageRow
from app.domain.review import Correction, ReviewAction, ReviewConflict, ReviewEvent
from app.domain.triaje import (
    Decision,
    Destination,
    DocumentNotFound,
    DuplicateDocument,
    Extraction,
    Priority,
    Status,
    Triage,
)


def decode_extraction(value: dict) -> Extraction:
    return Extraction(
        **(
            value
            | {
                "priority": Priority(value["priority"]),
                "audit_reasons": tuple(value["audit_reasons"]),
            }
        )
    )


def aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def decode_triage(document: DocumentRow, row: TriageRow) -> Triage:
    return Triage(
        document.public_id,
        document.channel,
        document.media_type,
        document.object_key,
        aware(row.created_at),
        decode_extraction(row.extraction_current),
        Decision(Status(row.status), Destination(row.destination), row.urgent_alert),
        document.provider,
        document.size_bytes,
        document.sha256,
        document.original_filename,
        document.bucket,
    )


def initial_row(triage: Triage, document_id: str) -> TriageRow:
    extraction = asdict(triage.extraction)
    return TriageRow(
        id=uuid4().hex,
        document_id=document_id,
        document_type=triage.extraction.document_type,
        priority=triage.extraction.priority,
        confidence=triage.extraction.confidence,
        status=triage.decision.status,
        destination=triage.decision.destination,
        urgent_alert=triage.decision.urgent_alert,
        extraction_original=extraction,
        extraction_current=extraction,
        created_at=triage.created_at,
        updated_at=triage.created_at,
        version=1,
        schema_version=1,
    )


class PostgresTriageRepository:
    def __init__(self, engine: Engine):
        self.engine = engine

    def create(self, triage: Triage, save_document: Callable[[], None]) -> None:
        token = uuid4().hex
        # This transaction ends BEFORE calling the storage/network callback.
        try:
            with Session(self.engine) as session, session.begin():
                document = session.scalar(
                    select(DocumentRow)
                    .where(DocumentRow.public_id == triage.document_id)
                    .with_for_update()
                )
                if document is not None:
                    if (
                        document.storage_state != "FAILED"
                        or document.sha256 != triage.sha256
                        or document.provider != triage.storage_provider
                        or document.bucket != triage.storage_bucket
                        or document.channel != triage.channel
                        or document.media_type != triage.media_type
                        or document.original_filename != triage.original_filename
                        or document.size_bytes != triage.size_bytes
                    ):
                        raise DuplicateDocument(triage.document_id)
                    document.object_key = triage.object_key
                    document.storage_state = "PENDING"
                    document.upload_token = token
                    document.updated_at = datetime.now(UTC)
                else:
                    document = DocumentRow(
                        id=uuid4().hex,
                        public_id=triage.document_id,
                        channel=triage.channel,
                        media_type=triage.media_type,
                        original_filename=triage.original_filename,
                        size_bytes=triage.size_bytes,
                        sha256=triage.sha256,
                        provider=triage.storage_provider,
                        bucket=triage.storage_bucket,
                        object_key=triage.object_key,
                        storage_state="PENDING",
                        upload_token=token,
                        created_at=triage.created_at,
                        updated_at=triage.created_at,
                    )
                    session.add(document)
                    session.flush()
                    session.add(initial_row(triage, document.id))
        except IntegrityError:
            raise DuplicateDocument(triage.document_id) from None
        try:
            save_document()
        except Exception:
            self._finish_upload(triage.document_id, token, "FAILED")
            raise
        self._finish_upload(triage.document_id, token, "READY")

    def _finish_upload(self, public_id: str, token: str, state: str) -> None:
        with Session(self.engine) as session, session.begin():
            document = session.scalar(
                select(DocumentRow).where(DocumentRow.public_id == public_id).with_for_update()
            )
            if document is None or document.upload_token != token:
                raise DuplicateDocument(public_id)
            document.storage_state = state
            document.upload_token = None
            document.updated_at = datetime.now(UTC)

    def _query(self, public_id: str | None = None):
        statement = (
            select(DocumentRow, TriageRow)
            .join(TriageRow, TriageRow.document_id == DocumentRow.id)
            .where(DocumentRow.storage_state == "READY")
        )
        if public_id is not None:
            statement = statement.where(DocumentRow.public_id == public_id)
        return statement

    def get(self, document_id: str) -> Triage:
        with Session(self.engine) as session:
            pair = session.execute(self._query(document_id)).first()
            if pair is None:
                raise DocumentNotFound(document_id)
            return decode_triage(*pair)

    def list(self) -> list[Triage]:
        with Session(self.engine) as session:
            return [
                decode_triage(*pair)
                for pair in session.execute(self._query().order_by(TriageRow.created_at.desc()))
            ]

    def review(
        self, document_id: str, transition: Callable[[Triage], tuple[Triage, ReviewEvent]]
    ) -> Triage:
        with Session(self.engine) as session, session.begin():
            pair = session.execute(self._query(document_id).with_for_update()).first()
            if pair is None:
                raise DocumentNotFound(document_id)
            document, row = pair
            updated, event = transition(decode_triage(document, row))
            row.extraction_current = asdict(updated.extraction)
            row.document_type = updated.extraction.document_type
            row.priority = updated.extraction.priority
            row.status = updated.decision.status
            row.destination = updated.decision.destination
            row.urgent_alert = updated.decision.urgent_alert
            row.version += 1
            row.updated_at = event.created_at
            session.add(
                ReviewRow(
                    id=event.review_id,
                    triage_id=row.id,
                    action=event.action,
                    reviewer=event.reviewer,
                    comment=event.comment,
                    created_at=event.created_at,
                    previous_status=event.previous_status,
                    new_status=event.new_status,
                    previous_destination=event.previous_destination,
                    new_destination=event.new_destination,
                    before=asdict(event.before),
                    after=asdict(event.after),
                    corrections=[asdict(correction) for correction in event.corrections],
                )
            )
            try:
                session.flush()
            except IntegrityError:
                raise ReviewConflict("Documento ya revisado") from None
            return updated

    def reviews(self, document_id: str) -> tuple[ReviewEvent, ...]:
        self.get(document_id)
        with Session(self.engine) as session:
            rows = session.scalars(
                select(ReviewRow)
                .join(TriageRow)
                .join(DocumentRow)
                .where(DocumentRow.public_id == document_id)
                .order_by(ReviewRow.created_at)
            ).all()
            return tuple(
                ReviewEvent(
                    row.id,
                    document_id,
                    ReviewAction(row.action),
                    row.reviewer,
                    row.comment,
                    aware(row.created_at),
                    Status(row.previous_status),
                    Status(row.new_status),
                    decode_extraction(row.before),
                    decode_extraction(row.after),
                    Destination(row.previous_destination),
                    Destination(row.new_destination),
                    tuple(Correction(**value) for value in row.corrections),
                )
                for row in rows
            )

    def reconcile(self, storage, public_id: str) -> str:
        # Never hold a database lock while reading a remote object.
        with Session(self.engine) as session:
            document = session.scalar(select(DocumentRow).where(DocumentRow.public_id == public_id))
            if document is None:
                raise DocumentNotFound(public_id)
            if document.storage_state == "READY":
                return "READY"
            if (datetime.now(UTC) - aware(document.updated_at)).total_seconds() < 300:
                raise ReviewConflict("Esperar cinco minutos antes de reconciliar una reserva")
            if (document.provider, document.bucket) != (
                getattr(storage, "provider", "local"),
                getattr(storage, "bucket", None),
            ):
                raise ReviewConflict("El adaptador no corresponde al almacenamiento del original")
            identity = (
                document.upload_token,
                document.storage_state,
                document.object_key,
                document.sha256,
                document.provider,
                document.bucket,
            )
            key, digest = document.object_key, document.sha256
        content = storage.read(key)
        if sha256(content).hexdigest() != digest:
            raise ReviewConflict("El hash del original no coincide; no se habilita el documento")
        with Session(self.engine) as session, session.begin():
            document = session.scalar(
                select(DocumentRow).where(DocumentRow.public_id == public_id).with_for_update()
            )
            if (
                document is None
                or (
                    document.upload_token,
                    document.storage_state,
                    document.object_key,
                    document.sha256,
                    document.provider,
                    document.bucket,
                )
                != identity
            ):
                raise ReviewConflict("La reserva cambio durante la reconciliacion")
            document.storage_state = "READY"
            document.upload_token = None
            document.updated_at = datetime.now(UTC)
        return "READY"

    def release_stale(self, public_id: str) -> None:
        """Operator-only retry release after stopping upload workers; never delete bytes."""
        with Session(self.engine) as session, session.begin():
            document = session.scalar(
                select(DocumentRow).where(DocumentRow.public_id == public_id).with_for_update()
            )
            if document is None:
                raise DocumentNotFound(public_id)
            if document.storage_state != "PENDING":
                raise ReviewConflict("Solo se liberan reservas pendientes")
            if (datetime.now(UTC) - aware(document.updated_at)).total_seconds() < 300:
                raise ReviewConflict("La reserva no esta vencida")
            document.storage_state = "FAILED"
            document.upload_token = None
            document.updated_at = datetime.now(UTC)
