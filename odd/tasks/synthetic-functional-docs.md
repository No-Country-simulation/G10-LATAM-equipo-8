# Synthetic functional test documents

## Objective
Add three clearly labeled fictional PDF inputs and a concise Spanish guide so the team can exercise MediFlow ingestion, Gemini extraction, OCI original-file storage, JSON detail retrieval, and repository durability without using real patient information.

## Problem and rationale
The current functional flow has been exercised with one fictional PDF. A small, repeatable set covering routine, urgent, and ambiguous inputs will make demos and manual verification more consistent while keeping the safety boundary explicit.

## Scope
- `.gitattributes` (only the narrow rule for `backend/data/functional/*.pdf`)
- `backend/data/functional/README.md`
- `backend/data/functional/rutina-001.pdf`
- `backend/data/functional/urgente-001.pdf`
- `backend/data/functional/ambiguo-001.pdf`

## Constraints
- Only synthetic names and values; every PDF must be conspicuously marked as fictional and not valid for clinical care.
- No real personal/clinical data, actionable treatment recommendations, or claims of clinical validation.
- Do not change API code, extraction schema, routing thresholds, provider configuration, or secrets.
- Explain that Gemini requests require human review and binary evidence remains unverified for PDFs.
- Preserve unrelated `backend/.env.example` and `.codegraph/` worktree state.
- No PR, merge, or branch deletion. The user explicitly authorized a push only to `origin/feature/backend-oci-storage` using the current authenticated Git session.
- Keep PDF binary handling scoped to `backend/data/functional/*.pdf` in `.gitattributes` to prevent Windows Git from normalizing line endings.

## Tasks
- [x] `SYNTH-01` Create three one-page, searchable synthetic PDFs representing routine, explicitly urgent, and ambiguous/conflicting intake cases. Include only data useful for demonstrating extraction and route review.
- [x] `SYNTH-02` Document Swagger upload fields, unique ID per run, GET detail, GET original document, expected statuses, and restart-based durability check; distinguish Gemini review behavior from deterministic route tests.
- [x] `SYNTH-03` Validate PDF signatures, extractable text, rendering/legibility, repository diff, and secret/unintended data absence.

## Authorized scope
The five paths listed under Scope plus this task file only. No other existing files may be modified.

## Acceptance criteria
- Three valid, legible, one-page PDFs with unmistakable synthetic-only notice.
- Cases are visibly differentiated and contain no clinical instructions that could be mistaken for real care.
- The guide provides a reproducible manual path and honestly states the current limitations: Gemini human review, `UNVERIFIED_BINARY_EVIDENCE` for PDF, and persistence depends on the configured repository.
- Verification evidence is recorded here; no claim of clinical safety or real dispatch.

## Route and forecast
- Route: delegated direct, one writer using the user-confirmed available model `gpt-6-luna`. Trigger: researching output constraints and authoring multiple non-trivial artifact files; one verification worker is not required for passive documents if structural checks and visual readback succeed.
- Estimated authored text: approximately 180 lines plus three generated PDF files (generated/binary output excluded from authored line forecast).
- Delivery strategy: ask-on-risk; this small artifact change is below the approximately 400-line slice heuristic.

## Verification
- Reopened all final PDFs with pypdf: each begins with `%PDF-`, has exactly one page, and has extractable text (869, 1038, and 1092 characters respectively). Confirmed the required disclaimer and each scenario's identifier/label; the ambiguous PDF contains both `RUTINA` and `PRIORIDAD ALTA`.
- Rendered all three PDF pages with Poppler `pdftoppm` and visually inspected the PNGs. Headers, disclaimer, scenario labels, body text, note, and footer were visible; no clipping or overlap was observed. Poppler emitted `No display font for 'Symbol'` and `ArialUnicode` warnings, but all pages rendered and inspected legibly.
- Root `.gitattributes` marks only `backend/data/functional/*.pdf` as binary. `git check-attr` reported `text`, `diff`, and `merge` unset for all three PDFs; staged `git diff --cached --check` passed without treating PDF bytes as text.
- Final path/status inspection: PASS. Added exactly `.gitattributes`, `backend/data/functional/README.md`, the three PDFs, and this task file. No other files were included. Unrelated `backend/.env.example` remains modified and `.codegraph/` remains untracked.
- No API or provider integration was run; this was a passive-document artifact task. No credentials, secrets, or real personal/clinical data were added.

## Progress and evidence
- The initial attempt stopped before artifact creation because the repository-assigned model `gpt-6.1-luna` was not available. The user clarified that `gpt-6-luna` is the requested available model; work proceeded using that authorized model. The required PDF marker ran successfully once before PDF generation.
- `SYNTH-01`: complete. Created three searchable, one-page PDFs with the required notice, synthetic identifiers, and distinct routine, sender-labeled urgent, and contradictory cases.
- `SYNTH-02`: complete. Added the Spanish quick path for Uvicorn on port 8002, health check, Swagger upload, expected 201, detail/original retrieval, extraction states, OCI verification, and repository-dependent restart persistence. Documented Gemini nondeterminism, manual review, unverified PDF binary evidence, and non-clinical meaning of `confidence=1`.
- `SYNTH-03`: complete. PDF signature, one-page text extraction, visual rendering/readback, path/privacy review, Git binary attributes, and staged whitespace check passed.

## Work-unit commit
- `b74352d` — `test(documentos): agregar PDFs sintéticos para pruebas funcionales` (three PDFs, Spanish guide, narrow binary rule, and task evidence).
- `fc3dc01` — `docs(plan): registrar commit de PDFs funcionales` (records the work-unit commit and verification result).
- Published both commits successfully to `origin/feature/backend-oci-storage`; push advanced the remote from `308c666` to `fc3dc01` without force.

## Next step
Run the documented manual API/OCI checks using the three synthetic PDFs; confirm Gemini extraction behavior, detail/original retrieval, and repository-dependent restart persistence. No API or live Gemini/OCI test was performed in this task.
