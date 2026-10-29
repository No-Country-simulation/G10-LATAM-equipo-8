from unittest.mock import Mock

import pytest
from google.genai import errors

from app.adapters.inbound.http.schemas import TriageResponse
from app.adapters.outbound.gemini_ai import GeminiExtractor
from app.adapters.outbound.local_storage import LocalDocumentStorage
from app.adapters.outbound.memory import MemoryTriageRepository
from app.adapters.outbound.simulated_ai import ROUTINE, SimulatedExtractor
from app.application.process_document import ProcessDocument
from app.application.triage_pipeline import TriagePipeline
from app.domain.extraction import ProcessingStatus, SourceReference
from app.domain.triaje import Destination, Extraction, Priority, Status, decide


class FixedExtractor:
    requires_human_review = False

    def __init__(self, extraction):
        self.extraction = extraction

    def extract(self, content, media_type):
        return self.extraction


def test_real_compiled_graph_executes_stages_and_simulation_stays_compatible():
    pipeline = TriagePipeline(SimulatedExtractor())
    result = pipeline.run(ROUTINE.encode(), "text/plain")
    assert result["trace"] == ["extract", "validate", "review_policy", "routine_proposal"]
    assert result["extraction"].patient_name == "Ana Demo"
    assert result["extraction"].audit_reasons == ()


def test_ambiguous_extraction_takes_human_review_branch_without_confidence_cutoff():
    extraction = Extraction(
        "Informe de Laboratorio",
        Priority.ROUTINE,
        0.01,
        "Demo",
        audit_reasons=("AMBIGUOUS",),
    )
    pipeline = TriagePipeline(FixedExtractor(extraction))

    result = pipeline.run(b"synthetic", "text/plain")

    assert result["trace"][-1] == "ambiguous_review"
    assert result["extraction"] == extraction


@pytest.mark.parametrize("patient_name", [None, "", "   "])
def test_missing_patient_name_requires_human_review_without_changing_extraction(patient_name):
    extraction = Extraction("Informe de Laboratorio", Priority.ROUTINE, 0.42, patient_name)

    decision = decide(extraction)

    assert decision.status == Status.NEEDS_AUDIT
    assert decision.destination == Destination.REVIEW
    assert decision.urgent_alert is False
    assert extraction.confidence == 0.42
    assert extraction.priority == Priority.ROUTINE


def test_populated_patient_name_preserves_existing_routine_decision():
    extraction = Extraction("Informe de Laboratorio", Priority.ROUTINE, 0.42, "Demo")

    decision = decide(extraction)

    assert decision.status == Status.PROCESSED
    assert decision.destination == Destination.HISTORY
    assert extraction.confidence == 0.42
    assert extraction.priority == Priority.ROUTINE


def test_possible_evidence_conflict_requires_review_without_changing_triage_or_api_evidence(
    tmp_path,
):
    extraction = Extraction(
        "Informe de Laboratorio",
        Priority.ROUTINE,
        0.42,
        "Demo",
        audit_reasons=("POSSIBLE_EVIDENCE_CONFLICT",),
        evidence=(
            SourceReference("patient_name", quote="Patient: Demo", asserted_value="Demo"),
            SourceReference("patient_name", quote="Patient: Alex", asserted_value="Alex"),
        ),
    )
    pipeline = TriagePipeline(FixedExtractor(extraction))
    repository = MemoryTriageRepository()
    storage = LocalDocumentStorage(tmp_path)

    result = ProcessDocument(pipeline, repository, storage).execute(
        "POSSIBLE-CONFLICT", "web", b"Patient: Demo\nPatient: Alex", "text/plain"
    )
    response = TriageResponse.from_domain(result).model_dump(mode="json")

    assert result.processing_status == ProcessingStatus.SUCCEEDED
    assert result.decision.status == Status.NEEDS_AUDIT
    assert result.decision.destination == Destination.REVIEW
    assert result.decision.urgent_alert is False
    assert result.extraction.priority == Priority.ROUTINE
    assert result.extraction.confidence == 0.42
    assert result.extraction.evidence == extraction.evidence
    assert response["extraction_evidence"][0]["asserted_value"] == "Demo"
    assert response["extraction_evidence"][1]["asserted_value"] == "Alex"


def test_urgent_extraction_takes_urgent_human_review_branch():
    extraction = Extraction("Informe de Laboratorio", Priority.URGENT, 0.99, "Demo")
    pipeline = TriagePipeline(FixedExtractor(extraction))

    result = pipeline.run(b"synthetic", "text/plain")
    decision = decide(result["extraction"])

    assert result["trace"][-1] == "urgent_review"
    assert result["extraction"] == extraction
    assert decision.status == Status.NEEDS_AUDIT
    assert decision.destination == Destination.REVIEW
    assert decision.urgent_alert is True


def test_low_reported_confidence_without_audit_reason_does_not_change_route():
    extraction = Extraction("Informe de Laboratorio", Priority.ROUTINE, 0.01, "Demo")
    pipeline = TriagePipeline(FixedExtractor(extraction))

    result = pipeline.run(b"synthetic", "text/plain")

    assert result["trace"][-1] == "routine_proposal"
    assert result["extraction"].confidence == 0.01


def test_graph_provider_failure_keeps_original_and_persists_safe_code(tmp_path):
    client = Mock()
    client.models.generate_content.side_effect = errors.APIError(
        403, {"error": {"code": 403, "message": "SECRET"}}
    )
    pipeline = TriagePipeline(GeminiExtractor("fake", "gemini-test", client=client))
    repository = MemoryTriageRepository()
    storage = LocalDocumentStorage(tmp_path)
    result = ProcessDocument(pipeline, repository, storage).execute(
        "GRAPH-FAILURE", "web", b"synthetic", "text/plain"
    )
    assert result.processing_status == ProcessingStatus.FAILED
    assert result.processing_error == "GEMINI_AUTH"
    assert result.decision.status == Status.NEEDS_AUDIT
    assert result.decision.destination == Destination.REVIEW
    assert result.extraction.confidence is None
    assert result.provenance.provider == "google-gemini"
    assert result.provenance.model == "gemini-test"
    assert result.provenance.prompt_version == "mediflow-extraction-v3"
    assert storage.read(result.object_key) == b"synthetic"
