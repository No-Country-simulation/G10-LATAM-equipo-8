# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Auditors and administrative staff who review clinical and administrative documents, understand why a case needs attention, and record an available human decision.

## Product Purpose

MediFlow receives documents, classifies and extracts available information, and records a routing decision. Ambiguous or otherwise reviewable cases can be examined by a human operator. Success means making processing, review, clinical priority, and routing legible without claiming that a decision was delivered or clinically validated.

## Positioning

The product combines document triage with a human-review path for cases that the current workflow sends for audit; the backend remains authoritative for extraction, states, and decisions.

## Operating Context

The frontend is a web application used to inspect loaded history and the audit queue, submit supported files to the configured API, and move between work destinations within one page session. The project also has an explicitly synthetic, two-record review sample. No real patient data is approved for this work.

## Capabilities and Constraints

- The active frontend uses React, TypeScript, shadcn/ui, and Tailwind CSS. Preserve the installed stack and assets; use documented Tailwind palette aliases rather than arbitrary visual values or inline styles.
- The supported file selection is PDF, PNG, JPG, and JPEG. The API remains authoritative for server-side limits and HTTP rejections such as 413 and 415.
- `status` describes review/result state; `processing_status` describes technical processing. Clinical priority may be unknown (`null`), and an audit-queue count is not an urgent-alert count.
- Urgent alerts can be identified only by `decision_enrutamiento.alerta_urgente === true` among records actually loaded by the frontend. The API does not provide a global alert count.
- A 201 response may record a document whose `processing_status` is `FAILED`; that is a recorded failure, not successful extraction.
- Service provenance distinguishes demo data from API mode. Only the known demo dataset is labeled `Datos ficticios`; `modo_ia=simulado` alone does not prove uploaded content is fictitious.
- The backend currently reports `almacenamiento_oci: null`. Do not present OCI persistence, provider activation, authentication, dispatch, or clinical validation as active capabilities.
- No new URL routes, account actions, AI retries, persisted drafts, dependencies, or backend contracts are part of this shell work.

## Brand Commitments

Keep the MediFlow name and user-approved logo (`src/assets/mediflow-logo.png`). The user-approved V2 interface direction is a light, white/slate work surface with teal-700 emphasis and the existing sidebar/list hierarchy, approximated only with documented Tailwind utilities. The four approved Canva references are read-only visual guidance; their layouts are not browser proof or permission to fabricate clinical originals.

## Evidence on Hand

- `../../docs/examples/frontend-review/historial.json` is the existing synthetic two-record history sample; it does not include original PDF or image bytes.
- `src/assets/mediflow-logo.png` is the user-approved brand asset.
- The approved UX brief and four Canva images are reference material, not evidence that the browser implementation matches them.

## Product Principles

1. Keep technical processing, human review, clinical priority, and routing as separate facts.
2. Treat the configured API as authority for uploaded documents, errors, and recorded results.
3. Make demo provenance explicit and never relabel API content as fictitious without evidence.
4. Preserve the human operator's active destination and make an upload result available without inventing server records or totals.

## Accessibility & Inclusion

Use responsive navigation with a mobile Sheet and desktop sidebar, visible active states, associated labels, logical headings, keyboard-visible focus, and status/error announcements. Responsive browser verification remains a separate future task.
