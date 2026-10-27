from dataclasses import asdict

import pytest

from app.adapters.outbound.postgres import decode_extraction
from app.domain.extraction import ExtractionProvenance, SourceReference
from app.domain.triaje import Extraction, Priority


def test_legacy_json_remains_supported_with_explicit_schema_version():
    value = {
        "document_type": "Receta Medica",
        "priority": "Rutina",
        "confidence": 0.2,
        "patient_name": None,
        "patient_age": None,
        "audit_reasons": ["LOW_CONFIDENCE"],
    }
    extraction = decode_extraction(value)
    assert extraction.schema_version == 1
    assert extraction.professional_name is None
    assert extraction.evidence == ()


def test_optional_common_fields_have_source_references_without_implied_truth():
    extraction = Extraction(
        "Receta Medica",
        Priority.ROUTINE,
        None,
        professional_name="Synthetic Professional",
        study="Synthetic study",
        evidence=(SourceReference("study", page=1, quote="Synthetic study"),),
    )
    assert extraction.schema_version == 4
    assert extraction.confidence is None
    assert extraction.diagnosis is None
    assert ExtractionProvenance().model is None


@pytest.mark.parametrize("confidence", [-1, 1.1, float("nan"), True, "0.5"])
def test_invalid_confidence_is_not_a_typed_extraction(confidence):
    with pytest.raises(ValueError):
        Extraction("Receta Medica", Priority.ROUTINE, confidence)


def test_v2_evidence_roundtrip_is_typed():
    original = Extraction(
        "Receta Medica",
        Priority.ROUTINE,
        0.2,
        schema_version=2,
        evidence=(SourceReference("patient_name", page=1, quote="Synthetic Demo"),),
    )
    assert decode_extraction(asdict(original)) == original


def test_evidence_without_asserted_value_remains_backward_compatible():
    legacy = {
        "document_type": "Receta Medica",
        "priority": "Rutina",
        "confidence": 0.2,
        "patient_name": None,
        "patient_age": None,
        "audit_reasons": [],
        "schema_version": 2,
        "professional_name": None,
        "professional_registration": None,
        "study": "Synthetic study",
        "indication": None,
        "diagnosis": None,
        "cie10_suggested": None,
        "evidence": [{"field": "study", "page": 1, "quote": "Synthetic study"}],
    }

    decoded = decode_extraction(legacy)

    assert decoded.evidence[0].asserted_value is None


def test_asserted_values_survive_extraction_json_roundtrip():
    original = Extraction(
        "Receta Medica",
        Priority.ROUTINE,
        0.2,
        evidence=(
            SourceReference("study", page=1, quote="Study: Alpha", asserted_value="Alpha"),
            SourceReference("study", page=2, quote="Study: Beta", asserted_value="Beta"),
        ),
        audit_reasons=("POSSIBLE_EVIDENCE_CONFLICT",),
    )

    assert decode_extraction(asdict(original)) == original


def test_medication_fields_survive_json_roundtrip_and_old_json_defaults_to_null():
    original = Extraction(
        "Receta Medica",
        Priority.ROUTINE,
        0.2,
        medication_name="Synthetic Drug",
        medication_dose="10 mg",
        evidence=(
            SourceReference(
                "medication_name",
                page=1,
                quote="Synthetic Drug 10 mg",
                asserted_value="Synthetic Drug",
            ),
            SourceReference(
                "medication_dose", page=1, quote="Synthetic Drug 10 mg", asserted_value="10 mg"
            ),
        ),
    )
    legacy = {
        "document_type": "Receta Medica",
        "priority": "Rutina",
        "confidence": 0.2,
        "patient_name": None,
        "patient_age": None,
        "audit_reasons": [],
        "schema_version": 3,
        "professional_name": None,
        "professional_registration": None,
        "study": None,
        "indication": None,
        "diagnosis": None,
        "cie10_suggested": None,
        "evidence": [],
    }

    assert decode_extraction(asdict(original)) == original
    decoded_legacy = decode_extraction(legacy)
    assert decoded_legacy.medication_name is None
    assert decoded_legacy.medication_dose is None


def test_processing_migration_offline_does_not_overwrite_legacy_originals():
    import importlib.util
    from io import StringIO
    from pathlib import Path

    from alembic.migration import MigrationContext
    from alembic.operations import Operations

    spec = importlib.util.spec_from_file_location(
        "processing_migration",
        Path(__file__).resolve().parents[1] / "migrations/versions/0003_processing_state.py",
    )
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    buffer = StringIO()
    migration.op = Operations(
        MigrationContext.configure(
            dialect_name="postgresql", opts={"as_sql": True, "output_buffer": buffer}
        )
    )
    migration.upgrade()
    sql = buffer.getvalue()
    assert "DEFAULT 'SUCCEEDED'" in sql
    assert "OLD.extraction_original IS NOT NULL" in sql
    assert "OLD.processing_status <> 'PROCESSING'" in sql
    assert "NEW.processing_token IS NOT NULL" in sql
    assert "UPDATE triages" not in sql


@pytest.mark.parametrize(
    "field",
    [
        "patient_name",
        "professional_name",
        "professional_registration",
        "study",
        "indication",
        "diagnosis",
        "cie10_suggested",
    ],
)
def test_optional_text_fields_reject_nonstring_values(field):
    with pytest.raises(ValueError):
        Extraction("Receta Medica", Priority.ROUTINE, 0.2, **{field: 123})


@pytest.mark.parametrize("age", [True, "30", 30.0, -1, 131])
def test_patient_age_uses_existing_strict_technical_contract(age):
    with pytest.raises(ValueError):
        Extraction("Receta Medica", Priority.ROUTINE, 0.2, patient_age=age)


@pytest.mark.parametrize("value", [123, True, "new unsupported type"])
def test_document_type_preserves_existing_supported_contract(value):
    with pytest.raises(ValueError):
        Extraction(value, Priority.ROUTINE, 0.2)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"field": 123},
        {"field": "study", "page": True},
        {"field": "study", "page": 1.5},
        {"field": "study", "quote": 123},
    ],
)
def test_source_reference_rejects_invalid_runtime_types(kwargs):
    with pytest.raises(ValueError):
        SourceReference(**kwargs)


@pytest.mark.parametrize(
    "kwargs", [{"provider": 123}, {"provider": ""}, {"model": 123}, {"prompt_version": 123}]
)
def test_provenance_rejects_invalid_runtime_types(kwargs):
    with pytest.raises(ValueError):
        ExtractionProvenance(**kwargs)


@pytest.mark.parametrize(
    "kwargs",
    [
        {"schema_version": True},
        {"audit_reasons": "LOW_CONFIDENCE"},
        {"audit_reasons": (123,)},
        {"evidence": []},
    ],
)
def test_version_and_collection_contracts_are_strict(kwargs):
    with pytest.raises(ValueError):
        Extraction("Receta Medica", Priority.ROUTINE, 0.2, **kwargs)


def test_empty_optional_strings_and_existing_age_boundaries_remain_supported():
    for age in (None, 0, 130):
        extraction = Extraction(
            "No determinado",
            Priority.ROUTINE,
            None,
            patient_name="",
            patient_age=age,
            study="",
            diagnosis="",
        )
        assert extraction.study == ""
