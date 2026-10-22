# Local CORS configuration

## Objective
Allow the MediFlow frontend development origins to call the FastAPI backend directly without enabling wildcard origins or credentials.

## Problem
The backend currently does not configure CORS. The frontend has reported local origins `http://localhost:5173` and `http://localhost:5174`; browsers treat these as distinct origins, and JSON requests may trigger preflight checks.

## Why
Enable local frontend/backend integration while keeping the allowed browser origins explicit and narrow.

## Scope
- Configure explicit CORS origins for `http://localhost:5173` and `http://localhost:5174`.
- Keep credentials disabled and avoid wildcard origins.
- Cover preflight and origin handling with API tests.
- Document the local frontend/backend contract and environment override.

## Constraints
- Do not inspect Neon or use remote credentials in this task.
- Do not modify frontend code, add deletion routes, or redesign document identifiers.
- Do not push, merge, open PRs, or delete branches.
- Preserve the existing hexagonal boundaries and project conventions.

## Authorized scope
- `backend/app/infrastructure/settings.py`
- `backend/app/infrastructure/bootstrap.py`
- `backend/tests/test_api.py`
- `backend/.env.example`
- `docs/CONTRATO_API_FRONTEND.md`

## Acceptance criteria
- Both reported local origins are explicitly allowed.
- Unknown origins receive no CORS authorization.
- Credentials are not enabled and wildcard origins are not used.
- Preflight for JSON requests succeeds for allowed origins.
- Tests and documented checks pass; no unrelated changes are included.

## Delivery plan
- Forecast: approximately 80 authored changed lines, excluding generated files.
- Strategy: ask-on-risk; below the delivery slice threshold unless implementation unexpectedly grows.
- Task T1 route: delegated direct. Trigger: the CORS implementation spans multiple non-trivial files, including configuration, app wiring, tests, and contract documentation.

## Tasks and progress
- [x] T1 — Add explicit local CORS configuration, tests, and contract documentation.
  - Checks: `uv run --locked pytest -q`; `uv run --locked ruff check app tests`; `uv run --locked ruff format --check app tests`; `git diff --check`.
  - Verification evidence: `.venv/Scripts/python.exe -m pytest -q` (241 passed); focused CORS settings regressions: 4 passed; `.venv/Scripts/python.exe -m ruff check app tests` (passed); `.venv/Scripts/python.exe -m ruff format --check app tests` (45 files already formatted); `git diff --check` (passed). Tests cover JSON environment override parsing and wildcard/malformed origin rejection. `uv` is unavailable in this environment. Pytest needed an unsandboxed run because Windows asyncio's local socket pair was blocked inside the sandbox. A pre-implementation RED result was not captured because of that runner limitation.
  - Commit identity: pending.

## Next step
Parent review and work-unit commit remain; do not push.
