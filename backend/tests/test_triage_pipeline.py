from unittest.mock import Mock

from google.genai import errors

from app.adapters.outbound.gemini_ai import GeminiExtractor
from app.adapters.outbound.local_storage import LocalDocumentStorage
from app.adapters.outbound.memory import MemoryTriageRepository
from app.adapters.outbound.simulated_ai import ROUTINE, SimulatedExtractor
from app.application.process_document import ProcessDocument
from app.application.triage_pipeline import TriagePipeline
from app.domain.extraction import ProcessingStatus


def test_real_compiled_graph_executes_stages_and_simulation_stays_compatible():
    pipeline = TriagePipeline(SimulatedExtractor())
    result = pipeline.run(ROUTINE.encode(), "text/plain")
    assert result["trace"] == ["extract", "validate", "review_policy"]
    assert result["extraction"].patient_name == "Ana Demo"
    assert result["extraction"].audit_reasons == ()


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
    assert result.extraction.confidence is None
    assert result.provenance.provider == "google-gemini"
    assert result.provenance.model == "gemini-test"
    assert result.provenance.prompt_version == "mediflow-extraction-v1"
    assert storage.read(result.object_key) == b"synthetic"
