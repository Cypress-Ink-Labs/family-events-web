# Plan 046: SPIKE: structured event-correction intake (D6)

> **Executor instructions**: Follow this plan step by step. This is a design spike:
> its deliverable is an RFC, not production code. Do not add a correction form,
> database table, RPC, review workflow, rate limiter, or admin UI while executing
> it. Run every applicable verification and confirm the expected result before
> moving to the next step. If anything in the "STOP conditions" section occurs,
> stop and report — do not improvise. When done, update the status row for this
> plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/legal/pages/legal-pages.tsx apps/web/src/features/events/pages/event-detail.tsx apps/web/src/features/explore/components/explore/explore-neighborhood-cta.tsx`
> Re-read every in-scope source file and compare it with the "Current state"
> excerpts before researching. A mismatch is a STOP condition; do not design an
> intake contract against changed legal terms, event-detail actions, or community
> submission affordances.

## Status

- **Priority**: P3
- **Effort**: M (as a spike)
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (design spike — output is an RFC, not code)
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

Event listings change: times, prices, availability, age suitability, and other
details can become stale after publication. The Terms already acknowledge that
users may submit event corrections, but Event Detail offers sharing, saving,
rating, and commenting without a correction path. Treating a correction as a
comment or direct edit would either hide a data-quality signal in a social
surface or give untrusted clients authority over published records.

This spike defines a bounded, auditable intake contract. It makes corrections
useful to reporters and administrators while preserving the canonical event
record, separating community event submission from correction reporting, and
keeping known backend work visible rather than silently coupling it to this
feature.

## Current state

The Terms recognize both unstable listing data and correction submissions.
`apps/web/src/features/legal/pages/legal-pages.tsx:78-97` says event details can
change, asks users to verify with organizers, and makes submitters responsible
for corrections:

```tsx
{
  title: "Event listings",
  body: [
    "Event information may come from public sources, organizers, venues, third-party providers, and editorial review. We work to keep listings useful, but event times, prices, availability, age suitability, and details can change.",
    "Before attending or purchasing tickets, confirm details with the event organizer, venue, or ticketing provider.",
  ],
},
{
  title: "Content you submit",
  body: [
    "If you submit ratings, comments, suggestions, event corrections, or other content, you remain responsible for that content.",
    "You grant Family Events permission to host, copy, display, modify, and use submitted content as needed to operate, improve, and promote the service.",
  ],
},
```

Event Detail wires sharing through `EventDetailHero`, planning through
`EventDetailBooking`, and rating/commenting through `EventDetailReviews`, but
has no correction action. `apps/web/src/features/events/pages/event-detail.tsx:229-285`:

```tsx
<EventDetailHero
  event={currentEvent}
  imageUrl={imageUrl}
  isFavorited={isFavorited}
  onFavoriteToggle={(_, state) =>
    setUiState({ favoritedOverride: { eventId: currentEvent.id, value: state } })
  }
  onShare={share}
/>

<EventDetailBooking
  event={currentEvent}
  startDate={startDate}
  attendees={attendees}
  onAddToCalendar={handleAddToCalendar}
  onExportCalendar={exportToCalendar}
/>

<EventDetailReviews
  canReview={isEnabled || isAdmin}
  isLoggedIn={Boolean(user)}
  userRating={userRating}
  comment={comment}
  onRatingChange={handleRatingChange}
  onSubmitComment={handleSubmitComment}
  isSubmitting={addComment.isPending}
  comments={comments}
/>
```

There is adjacent community-submission infrastructure, but it is a distinct
flow. `apps/web/src/features/explore/components/explore/explore-neighborhood-cta.tsx:24-38`
uses a “Know about an event?” CTA and routes to `/submit-event`:

```tsx
<h3 className="font-semibold text-foreground mb-1">Know about an event?</h3>
<p className="text-sm text-muted-foreground mb-3">
  Submit a community event and share it with local families.
</p>
<Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
  <Link to="/submit-event">Submit Event</Link>
</Button>
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full web gate (not required for this documentation-only spike) | `pnpm run verify:web` | exit 0 if intentionally run after a later web implementation |
| Web check (not required for this documentation-only spike) | `pnpm run web:check` | exit 0 if intentionally run after a later web implementation |
| Web tests (not required for this documentation-only spike) | `pnpm run web:test` | exit 0 if intentionally run after a later web implementation |
| Web build (not required for this documentation-only spike) | `pnpm run web:build` | exit 0 if intentionally run after a later web implementation |
| Workspace guards | `pnpm run workspace:test` | exit 0 if the RFC changes guarded documentation metadata |
| Docs guard | `pnpm run docs:test` | exit 0; documentation guards pass |
| Dead-code scan (not required for this spike) | `pnpm knip` | completes without a new relevant finding |
| Dependency audit (not required for this spike) | `pnpm audit` | completes with the repository's current audit result |

## Scope

**In scope**:
- Create `docs/rfcs/2026-07-24-event-corrections.md`.
- Read the two 2026-06-17 RFCs named in plan 044 for the repository's RFC
  format and contract-writing style.
- Specify a structured correction intake, its privacy/abuse limits, review
  outcomes, and the backend contract questions needed for a future build.

**Out of scope**:
- Any correction form, event mutation, database migration, RLS policy, RPC,
  rate limiter, queue worker, or admin-page implementation.
- Direct client edits to published events.
- Folding corrections into ratings/comments or into the `/submit-event`
  community-event submission flow.
- CIL-73/CIL-74's community-submission edit/cancel and submitter-feedback
  surfaces, and the known backend-blocked comment-moderation gap.

## Git workflow

- Branch: `advisor/046-spike-event-corrections`
- Conventional Commits, e.g. `docs(rfc): specify structured event corrections`.
- Do NOT push or open a PR.

## Steps

### Step 1: Establish the RFC baseline and evidence boundary

Read `docs/rfcs/2026-06-17-push-pipeline-gap.md` first and skim
`docs/rfcs/2026-06-17-submission-feedback.md`. Structure the new RFC with the
same problem/current-state evidence, resolved-decision table, backend-contract,
web implementation inventory, acceptance criteria, and dedicated final
open-questions section.

The current-state section must cite the live facts above: the Terms explicitly
permit suggestions and corrections while warning that listing details change;
Event Detail has share/save/rate/comment surfaces but no correction path; and
the Explore CTA sends new community-event submissions to `/submit-event`.

**Verify**: the RFC separates verified facts from proposed behavior and records
that correction intake is adjacent to, but distinct from, community submission.

### Step 2: Resolve the intake, privacy, and duplicate-handling decisions

Add `## Decisions (resolved open questions)` and choose explicit answers with
rationale for all of the following. No decision section may use “TBD”:

1. **Correction categories**: define the finite reporter-facing categories for
   factual listing changes (for example schedule, venue/location, price,
   age-suitability, cancellation/availability, and other), plus the minimum
   structured fields each category requires.
2. **Message and evidence limits**: choose bounded text length, permitted
   evidence/link policy, validation, and redaction posture. The contract must
   minimize personal data and prohibit credentials, child data, and unrelated
   sensitive material.
3. **Reporter visibility**: choose what a reporter can see after submission and
   whether they can see a status history; do not expose admin-only notes,
   reporter identities, or other users' corrections.
4. **Duplicate handling**: choose a deterministic same-event/category/time-window
   duplicate policy and the reporter-facing outcome rather than creating an
   unbounded duplicate queue.
5. **Admin triage outcomes**: define the finite review outcomes, including applied,
   rejected, duplicate/merged, and unable-to-verify, with any safe reporter
   notification policy.
6. **Persistence/security boundary**: corrections are immutable, JWT-scoped rows
   sent to a review queue; they are never direct event edits. Define immutable
   fields and what only an admin may add later as review metadata.
7. **Rate-limit stance**: choose an authenticated-user rate limit and an abuse
   handling/logging posture suitable for a closed beta.

**Verify**: all seven areas have one chosen answer and rationale, and the intake
cannot mutate a public event record directly.

### Step 3: Record separation and future web inventory

Add an explicit non-goals/cross-references section that separates this proposal
from:

- **CIL-73**: editing/cancelling a user's own community-event submission;
- **CIL-74**: submitter visibility and feedback for the community-event review
  lifecycle; and
- the known **backend-blocked comment-moderation gap**.

Explain that a correction is a report about an existing event, not a new event
submission and not a social comment. Add a bounded web change inventory for a
future phase: Event Detail correction affordance, authenticated correction form,
confirmation/duplicate state, reporter-owned status surface only if selected,
and an admin review queue. Do not implement or imply that any surface exists.

**Verify**: the RFC names all three separations and does not merge their queues,
ownership, or API contracts.

### Step 4: End with exact backend-repo contract questions

End the RFC with `## Open questions requiring backend-repo inspection`. Confine
unresolved backend material to that section and include these exact questions:

1. What JWT-scoped table and insert RPC can create an immutable correction row
   tied to `auth.uid()` and an existing event id, while denying direct client
   writes to event records and updates/deletes to submitted corrections?
2. Which normalized category enum, bounded message/evidence columns, and database
   checks enforce the selected input limits and forbid unsupported payloads?
3. How should evidence links be validated, stored, redacted, and protected from
   unsafe schemes or accidental sensitive content?
4. Which index/query strategy detects duplicate reports by event, category, and
   time window without leaking another reporter's identity or report contents?
5. What review-queue schema and admin-only RPCs record the selected triage outcome,
   applied event changes, reviewer identity, timestamps, and safe reporter-facing
   status without mutating the original correction?
6. Where will the authenticated-user rate limit, abuse signals, and audit trail
   be enforced so a client cannot bypass them by calling the RPC directly?
7. Which read RPC, if any, returns only a reporter's own correction receipt/status
   and never exposes admin notes, other reporters, or internal moderation data?

**Verify**: this is the final section of the RFC; all questions are precise and
no unresolved backend question remains in a decision section.

### Step 5: Review the RFC as a documentation deliverable

Review the completed RFC against the Terms, Event Detail, and the two RFC style
examples. Confirm that its correction model is structured, immutable, private,
and triaged — never a direct-edit escape hatch.

**Verify**: `pnpm run docs:test` → exit 0 and documentation guards pass.

## Test plan

- RFC review checklist: the document follows the established RFC structure and
  distinguishes current code evidence, resolved decisions, web inventory,
  backend contract, acceptance criteria, and open questions.
- Intake checklist: categories, bounded message/evidence rules, reporter
  visibility, duplicate handling, triage outcomes, immutable JWT-scoped queue
  rows, and rate-limiting each have explicit decisions.
- Safety checklist: no correction flow can directly edit events; reports are not
  comments or community submissions; reporter-facing data excludes admin notes
  and other reporters.
- Boundary checklist: CIL-73, CIL-74, and the backend-blocked comment-moderation
  gap are explicitly named as separate work.
- Documentation verification: `pnpm run docs:test` passes. No Vitest, build, or
  `verify:web` gate applies because this spike produces an RFC only.

## Done criteria

- [ ] `docs/rfcs/2026-07-24-event-corrections.md` exists and follows the repo RFC format.
- [ ] The RFC explicitly chooses correction categories, message/evidence limits,
      reporter visibility, duplicate handling, admin triage outcomes, and a
      rate-limit stance.
- [ ] Corrections are immutable, JWT-scoped rows in a review queue and are never
      direct event edits.
- [ ] The RFC explicitly separates this work from CIL-73, CIL-74, and the known
      backend-blocked comment-moderation gap.
- [ ] Decision sections contain no “TBD”; backend questions are confined to a
      dedicated final section.
- [ ] `pnpm run docs:test` exits 0.
- [ ] Only the RFC and plan-tracking documentation changed; no production code,
      migration, or backend contract was implemented.

## STOP conditions

- Any cited source no longer matches the Current state excerpts after the drift
  check.
- A proposed correction path directly edits an event, uses a comment as the
  correction record, or conflates correction reports with community submissions.
- The RFC would expose reporter identity, admin notes, another reporter's
  correction, child data, credentials, or unrelated sensitive information.
- A decision area remains unresolved outside the dedicated backend-question
  section, or “TBD” appears in a decision section.
- Completing the spike requires a form, migration, RPC, queue, rate limiter, or
  admin UI implementation.
- `pnpm run docs:test` fails after a documentation-only correction attempt.

## Maintenance notes

- A correction queue should preserve the submitted report and separately record
  triage metadata; an admin applying a verified change must not rewrite the
  reporter's original claim.
- The Event Detail affordance belongs near other event actions, but the
  community-submission CTA remains a different creation workflow.
- Keep CIL-73/CIL-74 and comment moderation independently scoped. Combining them
  would blur ownership and expand a low-risk design spike into an unreviewable
  moderation system.
- Reviewer focus: verify that the backend contract enforces JWT scope, immutable
  submissions, bounded input, duplicate controls, and rate limiting rather than
  relying on client behavior.
