from datetime import UTC, datetime

import pytest

from app.domain.review import InvalidReview, ReviewAction, ReviewConflict, review_triage
from app.domain.triaje import (
    Decision,
    Destination,
    Extraction,
    Priority,
    Status,
    Triage,
    decide,
)


def pending(priority=Priority.ROUTINE):
    return Triage(
        "DOC",
        "test",
        "text/plain",
        "recibidos/test",
        datetime.now(UTC),
        Extraction("Informe de Laboratorio", priority, 0.2, "Eva Demo", 40, ("LOW_CONFIDENCE",)),
        Decision(Status.NEEDS_AUDIT, Destination.REVIEW, priority == Priority.URGENT),
    )


def run(triage, action=ReviewAction.APPROVE, destination=Destination.HISTORY, changes=None):
    return review_triage(
        triage,
        action,
        "auditor-demo",
        "Revisado contra original",
        destination,
        changes or {},
        datetime.now(UTC),
    )


def test_approve_preserves_confidence_and_audit_reasons():
    original = pending()
    updated, event = run(original)
    assert updated.decision.status == Status.APPROVED
    assert updated.extraction == original.extraction
    assert event.before == original.extraction
    assert original.decision.status == Status.NEEDS_AUDIT
    with pytest.raises(ReviewConflict):
        run(updated)


def test_correction_keeps_original_and_before_after():
    original = pending()
    updated, event = run(original, ReviewAction.CORRECT_APPROVE, changes={"patient_age": None})
    assert updated.extraction.patient_age is None
    assert event.before.patient_age == 40
    assert event.corrections[0].before == 40
    assert event.corrections[0].after is None
    assert updated.extraction.confidence == 0.2


def test_rejection_preserves_urgent_alert_without_final_destination():
    updated, event = run(pending(Priority.URGENT), ReviewAction.REJECT, None)
    assert updated.decision.status == Status.REJECTED
    assert updated.decision.destination == Destination.REVIEW
    assert updated.decision.urgent_alert
    assert event.new_status == Status.REJECTED


@pytest.mark.parametrize(
    "changes",
    [
        {"patient_name": ""},
        {"patient_age": -1},
        {"patient_age": True},
        {"document_type": "Inventado"},
        {"priority": "Inventado"},
        {"confidence": 1},
        {"patient_age": 40},
    ],
)
def test_invalid_correction(changes):
    with pytest.raises(InvalidReview):
        run(pending(), ReviewAction.CORRECT_APPROVE, changes=changes)


def test_urgent_cannot_be_approved_for_history():
    with pytest.raises(InvalidReview):
        run(pending(Priority.URGENT))


def test_explicit_human_review_can_authorize_urgent_emergency_destination():
    updated, event = run(pending(Priority.URGENT), destination=Destination.EMERGENCY)

    assert updated.decision.status == Status.APPROVED
    assert updated.decision.destination == Destination.EMERGENCY
    assert updated.decision.urgent_alert
    assert event.new_destination == Destination.EMERGENCY


def test_decide_keeps_urgent_extraction_in_human_review():
    extraction = Extraction("Informe de Laboratorio", Priority.URGENT, 0.99, "Demo")

    decision = decide(extraction)

    assert decision.status == Status.NEEDS_AUDIT
    assert decision.destination == Destination.REVIEW
    assert decision.urgent_alert


def test_routine_decision_is_not_human_approval_or_dispatch():
    extraction = Extraction("Informe de Laboratorio", Priority.ROUTINE, 0.01, "Demo")

    decision = decide(extraction)

    assert decision.status == Status.PROCESSED
    assert decision.destination == Destination.HISTORY
    assert not decision.urgent_alert


@pytest.mark.parametrize(
    "extraction",
    [
        Extraction(
            "Informe de Laboratorio",
            Priority.ROUTINE,
            0.9,
            "Demo",
            audit_reasons=("AMBIGUOUS",),
        ),
        Extraction(None, Priority.ROUTINE, 0.9, "Demo"),
        Extraction("Informe de Laboratorio", None, 0.9, "Demo"),
        Extraction("Informe de Laboratorio", Priority.ROUTINE, None, "Demo"),
    ],
)
def test_ambiguous_or_incomplete_decision_requires_human_review(extraction):
    decision = decide(extraction)

    assert decision.status == Status.NEEDS_AUDIT
    assert decision.destination == Destination.REVIEW
