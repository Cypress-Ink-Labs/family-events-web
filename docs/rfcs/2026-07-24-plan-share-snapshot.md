# Multi-Event Plan Share Snapshot

**Date**: 2026-07-24 (spike)
**Status**: design — ready for backend-repo contract inspection; no production code changed
**Source plan**: 044
**Related**: [Plan share control](../../apps/web/src/features/plan/components/share-event-button.tsx) · [Public event preview](../../apps/web/src/features/events/pages/public-event-preview.tsx)

---

## Problem

The planner recommends a small, ordered plan, but its share control exposes only one event. A share
link therefore loses the lead/alternative relationship that makes the plan useful. Extending that
link without a snapshot contract would also risk publishing personalized inputs or creating a public
contract with no expiry, privacy boundary, or unavailable-event behavior.

This RFC defines a privacy-minimal, point-in-time plan artifact. It does not make a sharer's live
recommendation stream public and does not change the existing single-event sharing behavior.

---

## Current state (verified 2026-07-24)

- `apps/web/src/features/plan/components/share-event-button.tsx:15-27` accepts one `eventId` and
  `eventTitle`; its URL is `/share/${encodeURIComponent(eventId)}`. The existing control therefore
  emits only `/share/:eventId`.
- `apps/web/src/features/plan/hooks/use-plan-for-today.ts:182-198,222-230` hydrates ranked rows into
  ordered `events`, exposes `heroEvent` as index zero, and exposes at most two
  `secondaryEvents` with `slice(1, 3)`.
- `apps/web/src/features/events/pages/public-event-preview.tsx:24-50,124-145` reads one
  `public_events` row using the route event id, while its rendered label is “Shared plan.” It is a
  single-event preview, not a multi-event plan endpoint.
- `apps/web/src/features/marketing/pages/marketing.tsx:91-99` promises that families can save
  favorites and “plan the week in one place,” which supports preserving the plan rather than
  flattening it to one event.

This spike changes no code, database schema, route, RPC, RLS policy, or backend service.

---

## Decisions (resolved open questions)

| # | Decision | Chosen answer | Rationale |
|---|---|---|---|
| D1 | Snapshot contents | An immutable `v1` snapshot contains only ordered **published event IDs**, `plan_date` (calendar date), `city_label` (the planner's display city), and `planner_order` (zero-based order). It excludes user ID, sharer identity, child data, favorites, history/affinity inputs, precise user location, scores, distance, weather, and every other recommendation signal. | The recipient needs the plan's public members, date, place label, and sequence—not its personalized rationale. The narrow shape reduces privacy exposure and makes the artifact a point-in-time plan rather than a live recommendation feed. |
| D2 | Transport | **An unlisted, token-backed snapshot row** is the sole first-phase transport. A cryptographically random opaque token resolves server-side to the immutable snapshot; it is not a user-visible identifier or an event ID. | Server-side storage centralizes expiry enforcement, permits later safe redaction when an event becomes unavailable, avoids encoding even minimal snapshot data into URLs, and permits a versioned response without client-side signing-key or payload-parsing concerns. A **signed deterministic payload is rejected for this phase**: it is harder to revoke or redact after issue, leaks its contents to every URL holder, and couples future schema changes to long-lived signature validation. |
| D3 | Expiry and versioning | Every snapshot expires exactly **30 days after creation**. The stored and returned shape has a required `schema_version: 1`; future incompatible shapes receive a new version and render through a version-specific reader, never reinterpret a `v1` link as a newer shape. | Thirty days makes sharing useful for a near-term family plan while bounding accidental disclosure. Explicit versioning makes the response contract evolvable and preserves a stable meaning for links issued under `v1`. |
| D4 | Archived or unpublished events | At read time, each referenced event is checked for current public availability. A no-longer-public event keeps its position but renders only a generic “This event is no longer available” unavailable state—without title, description, venue, image, date, or deep link. Remaining public events render in original planner order; if none remain, the page shows a generic unavailable-plan state. The preview never substitutes a different event. | This preserves the snapshot's ordering honestly, prevents a stale link from leaking formerly public data, and avoids silently turning a family plan into a different recommendation. |

The snapshot is a record of what was shared at creation time, subject only to later removal of
unavailable public details. It is never a live copy of the sharer's personalized plan.

---

## Backend contract boundary (separate repository)

The chosen token-backed transport requires a future backend capability to create an unlisted,
JWT-owned snapshot from a validated plan and to return a safe, anonymous public preview by opaque
token. This RFC does not claim that a table, RPC, route, policy, or cleanup job already exists, and
it does not prescribe their names or implementation. The request and response must preserve the
resolved `v1` shape, 30-day expiry, and unavailable-event behavior above; the exact implementation
contract is limited to the final section's backend-repo inspection questions.

---

## Web change inventory (not implementation)

1. **Plan-level share action**: a future planner control receives the selected plan's ordered event
   IDs, plan date, and city label. It creates one plan snapshot; it does not reuse the event-scoped
   input shape or add private recommendation signals.
2. **Token route**: a future public route at `/share/plan/:token` is the sole plan-snapshot URL.
   `/share/:eventId` remains the existing single-event route and is not repurposed as a multi-event
   endpoint.
3. **Public plan preview**: a future page renders the snapshot's public events in planner order and
   reuses the safe display, loading, error, retry, and unavailable-event patterns demonstrated by
   `public-event-preview.tsx`. It has a distinct generic expired-link state and must not fetch or
   display unavailable event details.
4. **Query and share states**: the future query contract needs a token-specific query key and
   explicit loading, request-error, malformed-link, expired-link, absent-link, and partially
   unavailable states. The share dialog must wait for successful snapshot creation before exposing
   its `/share/plan/:token` URL and must present creation failure without falling back to a
   personalized or event-substitution URL.

This inventory is deliberately bounded: it describes later web surfaces only and implements none
of them in this spike.

---

## Acceptance criteria

- [ ] A future snapshot creates an opaque, unlisted token-backed `v1` artifact containing only
  published event IDs, plan date, city label, and planner order.
- [ ] The artifact has a fixed 30-day expiry and a version-specific rendering contract.
- [ ] The artifact contains no sharer identity, user ID, child data, favorites, history, affinity,
  precise location, score, distance, weather, or other private recommendation inputs.
- [ ] `/share/plan/:token` renders the remaining public events in original planner order and does
  not repurpose `/share/:eventId`.
- [ ] A malformed, absent, expired, or request-failed token reaches a distinct safe preview state;
  a partially unavailable snapshot preserves unavailable positions without revealing removed-event
  details; an entirely unavailable snapshot is generic.
- [ ] The plan-level share action exposes a URL only after snapshot creation succeeds.
- [ ] A later implementation reuses applicable safe preview patterns from
  `public-event-preview.tsx` and covers loading, error, expiry, and unavailable-event behavior.

## Open questions requiring backend-repo inspection

1. Which token-backed snapshot storage/RPC design can create an unlisted, JWT-owned snapshot and
   read it anonymously without exposing arbitrary rows?
2. What immutable fields and database constraints enforce published event IDs, plan date, city
   label, planner order, expiry, and schema version?
3. How will the backend atomically reject non-public IDs at creation and redact or mark unavailable
   events at read time after archival/unpublication?
4. What token entropy, index/lookup strategy, expiry cleanup, and abuse/rate controls meet the
   deployment's operational requirements?
5. Which RLS policies ensure a creator can create a snapshot but cannot use the public read path to
   enumerate another user's snapshots?
6. What response shape and status codes distinguish not found, expired, malformed, and partially
   unavailable snapshots for the web preview?
