from dataclasses import dataclass, replace
from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from app.domain.triaje import (
    DOCUMENT_TYPES,
    Decision,
    Destination,
    Extraction,
    Priority,
    Status,
    Triage,
)


class ReviewAction(StrEnum):
    APPROVE = "aprobar"
    CORRECT_APPROVE = "corregir_aprobar"
    REJECT = "rechazar"


class ReviewConflict(Exception):
    pass


class InvalidReview(Exception):
    pass


@dataclass(frozen=True)
class Correction:
    field: str
    before: str | int | None
    after: str | int | None


@dataclass(frozen=True)
class ReviewEvent:
    review_id: str
    document_id: str
    action: ReviewAction
    reviewer: str
    comment: str
    created_at: datetime
    previous_status: Status
    new_status: Status
    before: Extraction
    after: Extraction
    previous_destination: Destination
    new_destination: Destination
    corrections: tuple[Correction, ...]


CORRECTABLE_FIELDS = frozenset({"patient_name", "patient_age", "document_type", "priority"})


def review_triage(
    triage: Triage,
    action: ReviewAction,
    reviewer: str,
    comment: str,
    destination: Destination | None,
    changes: dict[str, str | int | None],
    now: datetime,
) -> tuple[Triage, ReviewEvent]:
    if triage.decision.status != Status.NEEDS_AUDIT:
        raise ReviewConflict("Solo se pueden revisar documentos pendientes de auditoria")
    if not reviewer.strip() or not comment.strip():
        raise InvalidReview("Revisor y comentario son obligatorios")
    if changes and action != ReviewAction.CORRECT_APPROVE:
        raise InvalidReview("Las correcciones requieren la accion corregir_aprobar")
    if changes.keys() - CORRECTABLE_FIELDS:
        raise InvalidReview("Hay campos que no admiten correccion")
    if action == ReviewAction.REJECT:
        if destination is not None:
            raise InvalidReview("Un rechazo no autoriza un destino")
        extraction = triage.extraction
        decision = Decision(Status.REJECTED, Destination.REVIEW, triage.decision.urgent_alert)
    else:
        if destination is None or destination == Destination.REVIEW:
            raise InvalidReview("Indicar un destino final para la aprobacion")
        if "priority" in changes:
            try:
                changes = changes | {"priority": Priority(changes["priority"])}
            except (ValueError, TypeError):
                raise InvalidReview("Prioridad invalida") from None
        try:
            extraction = replace(triage.extraction, **changes)
        except ValueError:
            raise InvalidReview("Correccion incompatible con el contrato de extraccion") from None
        if not isinstance(extraction.patient_name, str) or not extraction.patient_name.strip():
            raise InvalidReview("Indicar el nombre del paciente antes de aprobar")
        if extraction.patient_age is not None and (
            type(extraction.patient_age) is not int or not 0 <= extraction.patient_age <= 130
        ):
            raise InvalidReview("Edad fuera del rango de validacion tecnica")
        if extraction.document_type not in DOCUMENT_TYPES:
            raise InvalidReview("Confirmar un tipo documental soportado")
        if extraction.priority is None:
            raise InvalidReview("Confirmar la prioridad antes de aprobar")
        if extraction.priority == Priority.URGENT and destination != Destination.EMERGENCY:
            raise InvalidReview("La prioridad urgente requiere el destino de emergencia")
        decision = Decision(
            Status.APPROVED,
            destination,
            triage.decision.urgent_alert or extraction.priority == Priority.URGENT,
        )
    corrections = tuple(
        Correction(field, getattr(triage.extraction, field), getattr(extraction, field))
        for field in sorted(changes)
        if getattr(triage.extraction, field) != getattr(extraction, field)
    )
    if action == ReviewAction.CORRECT_APPROVE and not corrections:
        raise InvalidReview("Debe existir al menos una correccion efectiva")
    event = ReviewEvent(
        review_id=uuid4().hex,
        document_id=triage.document_id,
        action=action,
        reviewer=reviewer.strip(),
        comment=comment.strip(),
        created_at=now,
        previous_status=triage.decision.status,
        new_status=decision.status,
        before=triage.extraction,
        after=extraction,
        previous_destination=triage.decision.destination,
        new_destination=decision.destination,
        corrections=corrections,
    )
    return replace(triage, extraction=extraction, decision=decision), event
