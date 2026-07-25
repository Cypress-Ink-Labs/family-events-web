# Plan 044: SPIKE: multi-event plan share snapshot (D3)

> **Executor instructions**: Follow this plan step by step. This is a design spike:
> its deliverable is an RFC, not production code. Do not modify web source, database
> migrations, routes, or backend code while executing it. Run every applicable
> verification and confirm the expected result before moving to the next step. If
> anything in the "STOP conditions" section occurs, stop and report — do not
> improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/plan/components/share-event-button.tsx apps/web/src/features/plan/hooks/use-plan-for-today.ts apps/web/src/features/events/pages/public-event-preview.tsx apps/web/src/features/marketing/pages/marketing.tsx`
> Re-read every in-scope source file and compare its live code with the "Current
> state" excerpts before researching. A mismatch is a STOP condition; do not write
> an RFC against a changed share, planner, preview, or marketing contract.

## Status

- **Priority**: P3
- **Effort**: M (as a spike)
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (design spike — output is an RFC, not code)
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The planner deliberately presents a family-sized recommendation rather than one
isolated listing: a lead event and up to two alternatives. Its current sharing
control nevertheless serializes one event id into `/share/:eventId`, while the
public page labels that one-event artifact a “Shared plan.” That makes a shared
link lose the ordering and alternatives that made the plan useful, and risks
committing an accidental public-data contract if multi-event sharing is added
without first deciding privacy, expiry, and unavailable-event behavior.

This spike turns that ambiguity into one build-ready RFC. It must define a
shareable, minimal snapshot without exposing the sharer, children, or precise
location data, and isolate the backend contract still needed by this web-only
checkout.

## Current state

The existing control is event-scoped. `apps/web/src/features/plan/components/share-event-button.tsx:15-27`
accepts only `eventId` and `eventTitle`, then derives `/share/${eventId}`:

```tsx
interface ShareEventButtonProps {
  eventId: string
  eventTitle: string
}

export function ShareEventButton({ eventId, eventTitle }: ShareEventButtonProps) {
  const [manualOpen, setManualOpen] = useState(false)
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/share/${encodeURIComponent(eventId)}`
    }
    return `${window.location.origin}/share/${encodeURIComponent(eventId)}`
  }, [eventId])
```

The planner builds an ordered list and exposes a lead plus two secondary events.
`apps/web/src/features/plan/hooks/use-plan-for-today.ts:182-198,222-230` hydrates
ranked rows into `plannedEvents`, then assigns index zero as the hero and indices
one through two as secondaries:

```ts
acc.push({
  ...event,
  plan_score: row.score,
  distance_score: row.distance_score,
  weather_score: row.weather_score,
  age_score: row.age_score,
  history_affinity: row.history_affinity,
  distance_km: row.distance_km ?? null,
})

return {
  date: selectedDate,
  dayOffset: selectedOffset,
  weatherFit,
  weather: weather.data ?? null,
  events: plannedEvents,
  heroEvent: plannedEvents[0] ?? null,
  secondaryEvents: plannedEvents.slice(1, 3),
  fallbackMessage: fallbackMessageForOffset(selectedOffset),
}
```

The current public surface is a single-event preview. Its query is keyed by the
route event id and reads one `public_events` row (`apps/web/src/features/events/pages/public-event-preview.tsx:24-50`);
it labels that event “Shared plan” (`:124-145`):

```tsx
const { eventId } = useParams<{ eventId: string }>()
const isValidId = Boolean(eventId && UUID_PATTERN.test(eventId))

const { data: event, isLoading, isError, error, refetch } = useQuery({
  queryKey: ["public-event-preview", eventId],
  enabled: isValidId,
  queryFn: async (): Promise<PublicEventRow | null> => {
    // reads one public_events row by eventId
  },
})

<p className="text-xs font-semibold uppercase tracking-wide text-primary">
  Shared plan
</p>
<h1 className="text-2xl font-semibold tracking-tight text-foreground">
  {event.title ?? "Family event"}
</h1>
```

The product promise is broader than the single-event share link:
`apps/web/src/features/marketing/pages/marketing.tsx:96-98` says users can
“save favorites, and plan the week in one place.”

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
- Create `docs/rfcs/2026-07-24-plan-share-snapshot.md`.
- Read and use the RFC structure in `docs/rfcs/2026-06-17-push-pipeline-gap.md`,
  with `docs/rfcs/2026-06-17-submission-feedback.md` as a second style reference.
- Record the share-snapshot decisions, web change inventory, and backend contract
  questions specified below.

**Out of scope**:
- Any web source, route, service worker, Supabase schema/RLS/RPC, or backend-repo
  change.
- Extending the existing single-event `/share/:eventId` behavior during this spike.
- Including sharer identity, child data, saved/favorite history, exact user
  location, or other private recommendation inputs in a shared artifact.

## Git workflow

- Branch: `advisor/044-spike-plan-share-snapshot`
- Conventional Commits, e.g. `docs(rfc): specify multi-event plan share snapshots`.
- Do NOT push or open a PR.

## Steps

### Step 1: Establish the RFC baseline and document the verified web boundary

Read `docs/rfcs/2026-06-17-push-pipeline-gap.md` before drafting and skim
`docs/rfcs/2026-06-17-submission-feedback.md`. Use their title/date/status/source
plan block, horizontal-rule separation, problem/current-state evidence,
resolved-decision table, backend-contract section, implementation inventory,
acceptance criteria, and dedicated open-questions section as the RFC shape.

In the new RFC's current-state section, record the live facts above: the existing
control emits only `/share/:eventId`; the plan hook returns ordered
`events`, `heroEvent`, and at most two `secondaryEvents`; and the current public
preview fetches one `public_events` row while calling it a shared plan.

**Verify**: the RFC's current-state citations point to the live files and state
that this spike changes no code.

### Step 2: Resolve the snapshot data and privacy decisions

Add a `## Decisions (resolved open questions)` section. It must choose and give a
rationale for each of these, without leaving a decision as “TBD”:

1. **Snapshot contents**: published event ids only, the plan date, city label, and
   planner order. Explicitly exclude user id, child data, favorite/history inputs,
   and user location.
2. **Transport**: choose exactly one of an unlisted token-backed snapshot row or a
   signed deterministic payload. State why that option is safer and more
   maintainable for the defined contents; explicitly reject the other option for
   this first phase.
3. **Expiry and versioning**: choose a finite expiry policy and a versioned
   snapshot shape so rendering can evolve without reinterpreting old links.
4. **Archived or unpublished event behavior**: choose the user-visible behavior
   when a referenced event is no longer public; do not silently substitute another
   event or leak non-public details.

The RFC must treat the plan as a point-in-time snapshot, not a live copy of the
sharer's personalized recommendation stream.

**Verify**: every decision has one chosen answer and a rationale; only the
separate open-questions section may contain unresolved backend questions.

### Step 3: Record the build inventory without implementing it

Add a web change inventory that names the expected implementation surfaces:

- a plan-level share action that receives the selected plan event ids, plan date,
  and city label;
- a `/share/plan/:token` route;
- a public plan-preview page that reuses safe display and unavailable-event
  patterns from `public-event-preview.tsx`, rather than treating `/share/:eventId`
  as a multi-event endpoint;
- query-key, loading/error/expired-link, and share-dialog implications needed to
  deliver the chosen transport.

Keep this inventory descriptive and bounded. It must not prescribe source edits
or pretend that an RPC, schema, or route already exists.

**Verify**: the inventory covers the required plan action, token route, and
preview reuse, and does not widen the spike into implementation.

### Step 4: End with the backend-repo contract questions

End the RFC with `## Open questions requiring backend-repo inspection`. Keep all
unresolved material there, and phrase the exact questions needed to turn the
chosen transport into an implementation contract:

1. Which token-backed snapshot storage/RPC design can create an unlisted,
   JWT-owned snapshot and read it anonymously without exposing arbitrary rows?
2. What immutable fields and database constraints enforce published event ids,
   plan date, city label, planner order, expiry, and schema version?
3. How will the backend atomically reject non-public ids at creation and redact or
   mark unavailable events at read time after archival/unpublication?
4. What token entropy, index/lookup strategy, expiry cleanup, and abuse/rate
   controls meet the deployment's operational requirements?
5. Which RLS policies ensure a creator can create a snapshot but cannot use the
   public read path to enumerate another user's snapshots?
6. What response shape and status codes distinguish not found, expired, malformed,
   and partially unavailable snapshots for the web preview?

**Verify**: the RFC ends with this dedicated section and contains no open backend
question elsewhere.

### Step 5: Review the RFC as a documentation deliverable

Read the completed RFC against the two style references and this plan. Confirm
that it provides an explicit decision and rationale for contents, transport,
expiry/versioning, unavailable-event behavior, and the web inventory.

**Verify**: `pnpm run docs:test` → exit 0 and documentation guards pass.

## Test plan

- RFC review checklist: the document follows the established RFC title/date/status
  and section style; it separates verified facts, resolved decisions, implementation
  inventory, acceptance criteria, and backend questions.
- Decision checklist: snapshot contents, chosen transport with rationale,
  expiry/versioning, and archived/unpublished behavior each have an explicit answer;
  no “TBD” appears in any decision section.
- Privacy checklist: no sharer, child, saved/history, or precise-location data is
  included in the snapshot contract.
- Documentation verification: `pnpm run docs:test` passes. No Vitest, build, or
  `verify:web` gate applies because this spike produces an RFC only.

## Done criteria

- [ ] `docs/rfcs/2026-07-24-plan-share-snapshot.md` exists and follows the repo RFC format.
- [ ] The RFC explicitly chooses snapshot contents, one transport with rationale,
      expiry/versioning, and archived/unpublished-event behavior.
- [ ] The chosen snapshot contract contains only published event ids, plan date,
      city label, and ordering; it excludes user, child, and location data.
- [ ] The RFC inventories a plan-level share action, `/share/plan/:token`, and a
      preview surface reusing `public-event-preview` patterns.
- [ ] Decision sections contain no “TBD”; open backend questions are confined to
      a dedicated final section.
- [ ] `pnpm run docs:test` exits 0.
- [ ] Only the RFC and plan-tracking documentation changed; no production code,
      migration, or backend contract was implemented.

## STOP conditions

- Any cited source no longer matches the Current state excerpts after the drift
  check.
- The RFC cannot make a privacy-safe snapshot contract without adding sharer,
  child, saved-history, or precise-location data.
- A proposed decision requires a web, database, or backend implementation during
  this documentation-only spike.
- The RFC leaves a decision area unresolved outside its dedicated backend-question
  section, or uses “TBD” as a substitute for a decision.
- `pnpm run docs:test` fails after a documentation-only correction attempt.

## Maintenance notes

- The chosen transport and expiry policy are deliberately a share-contract
  decision, not an invitation to make planner recommendations publicly live.
- Retain the existing single-event route unless a later implementation explicitly
  migrates its callers; this spike only defines the new plan-level surface.
- Revisit expiry, token cleanup, and access telemetry after backend operational
  constraints are known; they are backend-contract questions, not reasons to
  expose personal planning inputs.
- Reviewer focus: confirm that unavailable events never leak a formerly public
  record and that no personal recommendation signals enter the snapshot.
