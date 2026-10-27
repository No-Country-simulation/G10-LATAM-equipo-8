# Backend integration into the main-based branch

## Goal

Integrate the backend OCI work into the isolated local branch `feature/backend-main-integration`, based on `origin/main`, without changing or publishing `main`.

## Problem and rationale

The frontend/deploy work is on `main`, while the backend implementation is on `feature/backend-oci-storage`. The local checkout also contains untracked development resources that must survive the integration.

## Authorized scope and constraints

- Merge `origin/feature/backend-oci-storage` into `feature/backend-main-integration` only.
- Preserve local `.agents/`, `.codegraph/`, `.neon`, `.tools/`, and `backend/` content; do not inspect or disclose `.neon` or environment-file values.
- Do not alter `main`, push, create PRs, delete branches, or change cloud services.
- After merge, inspect deployment/build configuration and perform safe local checks.
- Docker Desktop is reported running, but do not start services or contact Neon/OCI/Gemini without separate authorization.

## Acceptance criteria

- [x] Merge preserves both branch histories and is recorded on the integration branch.
- [x] No local-only or credential-bearing path is overwritten, staged, or published.
- [x] Post-merge verification confirms branch, merge ancestry, working-tree state, and build-context readiness.
- [x] Docker Compose config validates and backend/frontend images build locally without starting services.

## Tasks

- [x] INT-1 — Inventory untracked local resources and compare their paths against both branch trees.
- [x] INT-2 — Merge `origin/feature/backend-oci-storage` into `feature/backend-main-integration` after the user's explicit authorization. Merge commit: `fe43a4e749a033183cb8248190662bb82d7f14b1`.
- [x] INT-3 — Complete deterministic backend checks without modifying local secrets or data. Full configured suite passed outside the restricted Windows sandbox: 259 passed, 0 failed/errors/skipped/deselected, exit 0.
- [x] INT-4 — Correct Compose references to the canonical root `backend/` path and align deployment README references; preserve the existing deploy Dockerfile and ignore file.
- [x] INT-5 — Run one authorized real local smoke test through the active Gemini/PostgreSQL/OCI configuration and verify frontend proxy visibility using a synthetic PDF.
- [ ] INT-6 — Make private Neon validation files available to the Compose backend through configurable read-only mounts without copying secrets into the image; add regression coverage/docs, then rebuild and start an isolated local Compose project and verify service health without database migrations or new uploads.

## Route and evidence

- Route: direct inline Git integration; read-only repository mapping and Compose/README audit were delegated; source configuration/documentation correction used one bounded writer.
- Forecast: integration commit plus any narrowly scoped Compose adjustment; no PRs or remote publication.
- Evidence: current branch HEAD equals `origin/main` at `c21facf`; incoming ref is `origin/feature/backend-oci-storage` at `7f9d714`; merge base `815d18c`.
- Local `backend/` has 9,363 files; incoming branch has 67 tracked backend paths; exact path overlap is zero. No path is modified by both branches.
- Preserved untracked inventory: `.agents/` (28 files), `.codegraph/` (2), `.tools/` (18), `.neon` (one file), `backend/` (9,363). `.env`/`.neon` contents were not inspected.
- Merge completed after explicit user authorization with `git merge --no-ff --no-edit origin/feature/backend-oci-storage`. Parents are `c21facf5f852d6658dd476785d837bb0fcf814ff` and `7f9d714e93cd229457af7cdcc6932cdfb18c1bab`.
- `git diff --check HEAD^1 HEAD` passed. Branch remains `feature/backend-main-integration`, ahead of `origin/main` by 102 commits. No push, PR, or main update; two unstaged config/documentation changes remain plus this untracked task tracker.
- Compose audit found backend context points to ignored local-reference path, so a fresh clone cannot build it. Docker docs support an alternate Dockerfile relative to context; preserve existing deploy Dockerfile and Dockerfile-specific ignore file while pointing context to canonical `../../backend` and Dockerfile to `../Frontend/G10-Latam-Equipo-8/deploy/backend.Dockerfile` (verify relative resolution in the source change).
- Compose `env_file` injects environment variables; it does not mount private credential/config files. Do not inspect credential values; ensure README accurately distinguishes these behaviors.
- INT-4 completed: Compose now uses context `../../backend` and Dockerfile `../Frontend/G10-Latam-Equipo-8/deploy/backend.Dockerfile`; README documents the canonical paths and clarifies that `env_file` injects variables rather than mounting the private config file. It does not assert `.neon` or `.env.local` must be mounted.
- `git diff --check` passed. PowerShell static path validation resolved the context to repository-root `backend/`, the Dockerfile to the existing `Frontend/G10-Latam-Equipo-8/deploy/backend.Dockerfile`, and its `.dockerignore` companion beside it.
- Parent post-merge spot check confirmed the merge commit, branch, and both parents; `git diff --check` passed; PowerShell resolved context to repository-root `backend/`, Dockerfile to the existing deploy Dockerfile, and the Dockerfile-specific ignore file alongside it.
- Backend test attempts are inconclusive: full pytest stalled in `tests/test_oci_storage.py`; excluding that module collected 259 tests but 83 errored during Windows sandbox temp-directory setup after 147 passed; retrying with workspace-local `--basetemp` stalled for five minutes and was interrupted. No final suite summary exists; no assertion failures were confirmed. The workspace-local temporary directory was removed after checking it was the unique task-generated path.
- Earlier INT-3 attempts were blocked by the restricted Windows sandbox; the final complete host-context verification is recorded in Status below.

- User reports Docker Desktop is running and their PowerShell reports Docker Engine 29.9.2. Delegated verification ran `docker compose -f Frontend/G10-Latam-Equipo-8/compose.yaml config --quiet` and `docker compose -f Frontend/G10-Latam-Equipo-8/compose.yaml build backend frontend`; both passed. Parent spot check reran Compose config with an isolated empty temporary runtime config, exit 0. The delegated worker removed its temporary file; the parent removed its two unique temporary files. No services/containers started and no cloud dependencies contacted. An initial parent retry without the required `BACKEND_CONFIG_FILE` variable failed as expected; the placeholder path fixed validation without reading private configuration.
- INT-5 real local smoke test (2026-10-26): `/health` reported `ia=gemini`, `repositorio=postgres`, `almacenamiento=oci`; frontend root and Vite proxy returned HTTP 200. Uploaded only `backend/data/functional/ambiguo-001.pdf` under ID `INT-LOCAL-20261026-01`. POST processing succeeded, persisted via OCI, and routed to human audit because binary evidence/conflict are intentionally unverified; GET detail returned `SUCCEEDED`; original-document GET returned HTTP 200 with `application/pdf`; Vite proxy GET for detail returned HTTP 200. Frontend displayed the new record and totals incremented by one. Credentials were not inspected or printed. Docker/Compose services were not started.

## Status

Merge and INT-4 deployment-path correction are complete. INT-4 was committed as `2f538b0` (`chore(deploy): usar backend canónico en Compose`). Docker Compose configuration and both image builds are verified. INT-5 real local integration smoke test passed against Gemini/PostgreSQL/OCI with one synthetic PDF; the frontend and Vite proxy displayed/read the new record. INT-3 is complete: the full configured backend pytest suite passed outside the restricted sandbox (259 passed). Services were not restarted and Docker/Compose was not used. The test record and OCI object remain as synthetic audit evidence; no DELETE workflow was exercised.
- INT-3 retry (2026-10-26): still incomplete. A bounded run collected 259 tests but timed out after 120s before any test completed; faulthandler showed a Windows asyncio socketpair/TestClient portal startup stall during `tests/test_api.py` fixture setup. No assertion failures were observed. The run's unique `.pytest-verify-*` basetemp was removed after verifying it was created by this attempt.
- INT-3 focused deterministic subset (2026-10-26): 60 passed, 0 failed, 0 skipped, 1 deselected in 1.05s using `tests/test_review_domain.py`, `tests/test_extraction_contract.py`, and `tests/test_gemini_settings.py -k "not migration"` with plugin autoload disabled. Full suite remains incomplete due the separate Windows asyncio/TestClient startup stall; this subset is not a full-suite pass.
- INT-3 complete verification (2026-10-26): outside the restricted sandbox, a direct socket.socketpair() probe passed and the full configured backend suite completed with 259 passed, 0 failed/errors/skipped/deselected, exit 0 (pytest 6.24s; subprocess 7.67s), using the backend venv with plugin autoload and bytecode/cache writes disabled. This is the full-suite result; earlier socketpair/TestClient hangs only occurred in the restricted sandbox.
- INT-6 authorized by user (2026-10-26): fix the Compose startup blocker caused by backend settings requiring private `.neon` and `.env.local` files at container filesystem root while the image contains only application source. Never print secret values, add private config to image/build context, run migrations, upload a document, touch `main`, push, or merge. Candidate implementation: introduce configurable file-path settings with backward-compatible local defaults, mount private files read-only at non-root runtime paths, wire paths into Compose, and document private local setup. Verify with focused RED/GREEN tests, Compose config/build, isolated project `mediflow-local-test` startup, `/health`, and frontend root; do not tear down or alter unrelated containers/volumes.
- INT-6 route: delegated direct; writer trigger applies because the authorized fix spans backend settings/tests, Compose, and deployment docs. RDD status was `off` (clone-local unset); no native review is started.
- INT-6 implementation verification (2026-10-26): regression was observed RED before implementation and GREEN after; focused pytest passed 4 tests, then an independent verifier repeated the focused test (4 passed). Compose config and image build/start passed under isolated project `mediflow-local-test`; both containers remain running. GET `/` and `/health` each returned HTTP 200. The verifier could not parse/extract the health response fields, so `status=ok` and configured mode labels are not yet confirmed; INT-6 remains open pending semantic health confirmation. No migrations, uploads, secret reads, cleanup, or cloud management operations were performed.
