# Structured Event-Correction Intake

**Date**: 2026-07-24 (spike)
**Status**: design — ready for backend-repository contract inspection before any web implementation
**Source plan**: 046
**Related**: [CIL-73](https://linear.app/hexsleeves/issue/CIL-73) (community-submission edit/cancel), [CIL-74](https://linear.app/hexsleeves/issue/CIL-74) (community-submission feedback)

---

## Problem

Published event details can become inaccurate after publication. The product needs a narrow way for an authenticated user to report a factual change without treating the report as a social comment, a new community-event submission, or a client-authorized edit to the published event.

This RFC defines the proposed intake contract only. It does not add a form, database object, RPC, rate limiter, review queue, or administrative UI.

## Current state

The following are verified web facts, not proposed behavior:

- `apps/web/src/features/legal/pages/legal-pages.tsx:78-97` states that event times, prices, availability, age suitability, and other details can change; asks users to verify details with an organizer, venue, or ticketing provider; and says that submitters of ratings, comments, suggestions, **event corrections**, and other content remain responsible for it. The Terms also prohibit harmful or misleading content.
- `apps/web/src/features/events/pages/event-detail.tsx:229-285` renders `EventDetailHero` with sharing, `EventDetailBooking` with favorite/calendar planning actions, and `EventDetailReviews` with rating and comment actions. It contains no correction-report affordance or correction data path.
- `apps/web/src/features/explore/components/explore/explore-neighborhood-cta.tsx:24-38` labels the community flow “Know about an event?”, describes it as submitting a community event, and routes its CTA to `/submit-event`. That is a new-event submission route, not a correction route.

Therefore, correction intake is adjacent to existing event and community-submission surfaces, but is a distinct proposed workflow.

## Decisions (resolved open questions)

| # | Area | Decision | Rationale |
|---|---|---|---|
|---|---|---|---|
| D1 | Categories and minimum fields | The reporter selects exactly one finite category: **schedule**, **venue/location**, **price**, **age suitability**, **cancellation/availability**, or **other factual detail**. Every request includes the existing `event_id`, category, and a short factual explanation. `schedule` additionally requires a proposed start date and local start time, with proposed end date/time optional. `venue/location` requires a proposed venue name or full location text. `price` requires a proposed price state (`free`, `paid`, or `unknown`) and, for `paid`, an amount and ISO currency. `age suitability` requires either a proposed minimum age, maximum age, or suitability value (`all-ages`, `family-friendly`, `adult-only`, or `unknown`). `cancellation/availability` requires a proposed state (`available`, `sold-out`, `cancelled`, `postponed`, or `unknown`); `postponed` also requires a proposed new date when known. `other factual detail` requires a concise field label and proposed replacement value. | A finite taxonomy enables targeted triage and deterministic duplicate detection while preserving an escape hatch for factual fields not yet modeled. Required structured values prevent a generic comment box from becoming the canonical payload. |
| D2 | Message and evidence limits | The explanation is required, plain text, trimmed, and limited to **1,000 Unicode characters**. Evidence is optional and limited to **two public `https` URLs**, each at most **2,048 characters**; uploads, attachments, HTML, credentials-in-URLs, and non-HTTPS schemes are rejected. The client and backend must state that reporters must not include credentials, payment data, contact details, child data, health information, precise home addresses, or unrelated sensitive material. Stored evidence is display-only until an authorized reviewer deliberately opens it; the system does not fetch it automatically. | Bounded text and links are enough to make a factual claim reviewable without collecting a general-purpose dossier. The no-upload, no-auto-fetch posture minimizes sensitive-data collection and avoids turning evidence processing into an unsafe retrieval path. |
| D3 | Reporter visibility | After a successful insert, the reporter receives a receipt containing only their event title, selected category, submission timestamp, and a generic current status. A future reporter-owned status surface may list only that authenticated reporter's receipts and current safe status; it does **not** expose status history, reviewer identity, admin notes, other reporters, other corrections, or the exact applied event change. | A receipt confirms that the report entered intake without leaking the internal review process or revealing whether another person made a similar report. A current-status-only view is simpler and avoids exposing mutable moderation history. |
| D4 | Duplicate handling | On a request, the backend checks for an existing correction for the same `event_id` and category submitted in the preceding **seven days** whose review outcome is not terminal. If one exists, it creates no new correction row and returns the same generic receipt shape with `already-received` status; it returns neither the existing report identifier nor reporter information. Otherwise it creates one immutable correction row. The check and insert occur atomically in the server-side write path. | This is deterministic, bounded by event/category/time window, and keeps an unbounded duplicate queue out of administrator work while preserving reporter privacy. |
| D5 | Admin triage outcomes | An administrator records exactly one terminal outcome: **applied**, **rejected**, **duplicate/merged**, or **unable-to-verify**. `applied` requires an auditable reference to the separately authorized event change; it is never an event mutation performed by the correction intake. A safe reporter-facing status may say `updated`, `not applied`, `already received`, or `could not verify`; no free-form internal rationale is exposed. | A finite outcome set produces reliable reporting and separates a triage decision from the privileged event-maintenance operation that might follow it. |
| D6 | Persistence and security boundary | A report is an immutable, JWT-scoped queue row: the write path derives `reporter_id` from `auth.uid()` and validates that `event_id` exists. The original row's identifier, event id, reporter id, category, structured proposed values, explanation, evidence URLs, submission timestamp, duplicate-window key, and submitted payload are never client- or admin-editable after insert. Only administrators may later append separate review metadata: outcome, reviewer id, reviewed timestamp, safe reporter status, internal note, and (for `applied`) a reference to the independently authorized event change. No client correction request directly updates an event record. | Immutability preserves the submitted claim for audit. JWT scoping prevents user-id spoofing, and separate review metadata makes it impossible to convert the intake into a direct-edit escape hatch. |
| D7 | Closed-beta rate-limit and abuse stance | The backend enforces an authenticated-user limit of **five accepted correction submissions per rolling 24 hours** across all events and categories; duplicate responses do not consume the quota. It records rejected validation attempts, rate-limit denials, and accepted submissions in an audit trail keyed to the authenticated user and request metadata, with no raw sensitive payload added beyond the report itself. Repeated abusive or harmful submissions are handled through the existing Terms-based account moderation process. | Five reports cover normal beta use while making bulk spam expensive. Enforcement at the server-side write boundary prevents a client from bypassing the policy by calling an RPC directly. |

## Backend contract (separate repository — prerequisite to any build)

A future backend implementation must provide an authenticated write boundary that receives the D1 structured payload, derives the reporter identity from the JWT, performs D4 duplicate handling and D7 rate limiting atomically, and writes only an immutable correction row. A separate admin-only review boundary may append D5/D6 review metadata and, when appropriate, invoke an independently authorized event-maintenance workflow. The correction write boundary must never have authority to update a published event.

## Web implementation inventory (future phase)

No web surface exists today. After the backend contract is verified, a future phase is bounded to:

1. an Event Detail correction affordance that is visually and behaviorally separate from rating, comments, saving, sharing, and calendar actions;
2. an authenticated correction form that presents only D1 categories and D2-bounded inputs;
3. success, validation, rate-limit, and `already-received` confirmation states that disclose no other reporter's data; 
4. the reporter-owned current-status surface selected in D3; and
5. an admin review queue that uses the separate admin review boundary.

This inventory is intentionally not an implementation plan and does not imply that any of these surfaces has shipped.

## Non-goals and cross-references

A correction is a report about an existing event. It is not a request to create a new event, a social comment, or permission to edit the event directly.

- **CIL-73** concerns a user editing or cancelling that user's own community-event submission. Its ownership model is the submitting user and their submitted event; it does not own or mutate correction reports.
- **CIL-74** concerns submitter visibility and feedback for the community-event review lifecycle. Its queue and feedback apply to a newly submitted community event, not a report about an existing event.
- The known **backend-blocked comment-moderation gap** remains a separate social-comment concern. Comment moderation neither stores structured factual corrections nor decides whether a canonical event field should change.

These workstreams must not share queues, ownership rules, or API contracts. The Explore CTA's `/submit-event` path remains for community submissions only; correction intake must be reached from the existing event being reported.

## Acceptance criteria

- [ ] The correction write boundary accepts only the D1 structured categories and required values, D2-bounded explanation, and optional D2-compliant evidence URLs.
- [ ] An authenticated reporter can receive a private receipt and, if the D3 surface is built, read only their own current safe status.
- [ ] Duplicate detection atomically applies the D4 event/category/seven-day policy without exposing another report or reporter.
- [ ] Every accepted report remains immutable; no correction client path can update an event record.
- [ ] Only an admin review boundary can append D5/D6 metadata, and `applied` records a reference to a separately authorized event change.
- [ ] The D7 rate limit and abuse audit are enforced server-side.
- [ ] A future web implementation keeps correction reporting separate from `/submit-event`, ratings, comments, CIL-73, CIL-74, and the backend-blocked comment-moderation gap.

## Open questions requiring backend-repo inspection

1. What JWT-scoped table and insert RPC can create an immutable correction row tied to `auth.uid()` and an existing event id, while denying direct client writes to event records and updates/deletes to submitted corrections?
2. Which normalized category enum, bounded message/evidence columns, and database checks enforce the selected input limits and forbid unsupported payloads?
3. How should evidence links be validated, stored, redacted, and protected from unsafe schemes or accidental sensitive content?
4. Which index/query strategy detects duplicate reports by event, category, and time window without leaking another reporter's identity or report contents?
5. What review-queue schema and admin-only RPCs record the selected triage outcome, applied event changes, reviewer identity, timestamps, and safe reporter-facing status without mutating the original correction?
6. Where will the authenticated-user rate limit, abuse signals, and audit trail be enforced so a client cannot bypass them by calling the RPC directly?
7. Which read RPC, if any, returns only a reporter's own correction receipt/status and never exposes admin notes, other reporters, or internal moderation data?
