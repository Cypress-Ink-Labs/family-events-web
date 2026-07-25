# Plan 045: SPIKE: saved / planned / attended lifecycle (D4)

> **Executor instructions**: Follow this plan step by step. This is a design spike:
> its deliverable is an RFC, not production code. Do not alter web source, database
> migrations, RPCs, or organizer integrations while executing it. Run every
> applicable verification and confirm the expected result before moving to the next
> step. If anything in the "STOP conditions" section occurs, stop and report — do
> not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/events/api/calendar.ts apps/web/src/features/events/pages/event-detail.tsx apps/web/src/features/events/components/event-detail/booking.tsx apps/web/src/features/my-events/pages/my-events.tsx`
> Re-read every in-scope source file and compare it with the "Current state"
> excerpts before researching. A mismatch is a STOP condition; do not define a
> lifecycle against changed calendar, booking, rating, or My Events behavior.

## Status

- **Priority**: P3
- **Effort**: M (as a spike)
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (design spike — RFC output)
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

“Saved” currently means two different user intentions: an idea in favorites and
a calendar entry that may indicate a planned outing. The app then treats every
past saved record as attended and makes it rateable, even though saving or
opening an organizer booking link is not evidence of attendance. The database
already has a dormant `notes` field on a calendar record, and the booking card
collects an attendee count, but neither produces a durable, coherent lifecycle.

This spike specifies a small, privacy-respecting model that tells users what
state an event is in and gives ratings a trustworthy gate. It preserves the
existing external organizer booking boundary rather than inventing a booking
integration in the web app.

## Current state

The calendar API already stores a notes column, but its toggle-oriented caller
supplies only the event identity and membership state. `apps/web/src/features/events/api/calendar.ts:4-34`
selects `notes` and accepts an optional note on insert:

```ts
const CALENDAR_COLUMNS = "id, user_id, event_id, added_at, notes"

export async function addToCalendar(
  userId: string,
  eventId: string,
  notes: string | null = null
): Promise<void> {
  const { error } = await supabase.from("user_calendar_events").insert({
    user_id: userId,
    event_id: eventId,
    notes,
  })
  if (error) throw error
}
```

`apps/web/src/features/events/pages/event-detail.tsx:174-191` calls the
calendar mutation with only `eventId` and `isInCalendar`, then calls the result
“Added to your calendar” or “Removed from calendar”:

```tsx
const nextState = await toggleCalendarEvent.mutateAsync({
  eventId: currentEvent.id,
  isInCalendar,
})
setUiState({ calendarOverride: { eventId: currentEvent.id, value: nextState } })
toast.success(nextState ? "Added to your calendar!" : "Removed from calendar")
```

The attendee control is local UI state. The actual source is
`apps/web/src/features/events/components/event-detail/booking.tsx` (not
`pages/event-detail/booking.tsx`): its props receive `attendees`, and the count
only changes displayed organizer-link copy and price (`:8-16,41-70`):

```tsx
interface EventDetailBookingProps {
  event: EventWithDetails
  startDate: Date
  attendees: number
  onDecrement: () => void
  onIncrement: () => void
  isInCalendar: boolean
  onAddToCalendar: () => void
  onExportCalendar?: () => void
}

<a href={safeHref(event.source_url)} target="_blank" rel="noopener noreferrer">
  {event.is_free
    ? "Reserve Your Spot (Free)"
    : event.price != null
      ? `Book Now · $${event.price * attendees}`
      : "Book Now"}
</a>
```

My Events merges favorites and calendar records into one saved-id set.
`apps/web/src/features/my-events/pages/my-events.tsx:28-50` unions their event
ids, while `:59-73` places all past saved events into `pastEvents` based only on
time. The Past tab says “Events you've attended will appear here” and exposes
rating for every past row (`:208-246`):

```ts
const favoriteIds = new Set(favorites.map((favorite) => favorite.event_id))
const calendarIds = new Set(calendarEvents.map((calendarEvent) => calendarEvent.event_id))
return [...new Set([...favoriteIds, ...calendarIds])]

const pastEvents = useMemo(() => {
  const now = new Date()
  return sortByStartDatetime(
    savedEvents.filter((e) => new Date(e.start_datetime) < now),
    "desc"
  )
}, [savedEvents])
```

```tsx
<EmptyState
  icon={Star}
  title="No past events"
  description="Events you've attended will appear here."
  cta="Find Events"
  ctaHref="/explore"
/>

<EventRow
  event={event}
  onRemove={handleRemove}
  rating={ratings[event.id]}
  onRate={async (score) => {
    await upsertRating.mutateAsync({ eventId: event.id, score })
  }}
  variant="past"
/>
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
- Create `docs/rfcs/2026-07-24-saved-planned-attended.md`.
- Read the two 2026-06-17 RFCs named in plan 044 for the repository's RFC
  formatting and decision-contract style.
- Define lifecycle semantics, migration/copy direction, and the backend questions
  required to make them real.

**Out of scope**:
- Any web, database, RPC, RLS, or backend-repository implementation.
- Sending attendee count, notes, or booking information to an organizer.
- Inferring attendance from a timestamp, favorite, calendar save, browser click,
  or external booking handoff.
- Replacing the organizer's booking/ticketing flow.

## Git workflow

- Branch: `advisor/045-spike-saved-planned-attended`
- Conventional Commits, e.g. `docs(rfc): define saved planned attended lifecycle`.
- Do NOT push or open a PR.

## Steps

### Step 1: Establish the RFC baseline and lifecycle evidence

Read `docs/rfcs/2026-06-17-push-pipeline-gap.md` first and skim
`docs/rfcs/2026-06-17-submission-feedback.md`. Create the RFC with the same
purpose/problem, verified-current-state, resolved-decisions, backend-contract,
implementation-inventory, acceptance-criteria, and dedicated-open-questions
shape.

Its current-state section must cite the live facts above: `user_calendar_events`
already has `notes`; Event Detail's calendar action does not send notes or party
size; the booking count affects only displayed external-booking price; My Events
unions favorites and calendar records, and its past tab treats each past saved
row as attended/rateable.

**Verify**: the RFC accurately distinguishes observed web behavior from the
lifecycle it proposes, and names the corrected live paths.

### Step 2: Resolve the lifecycle, data ownership, and attendance decisions

Add `## Decisions (resolved open questions)` and explicitly choose the following
answers with rationale; do not leave “TBD” in the decision section:

1. **Lifecycle**: `favorite/idea → planned (calendar) → attended | did-not-go`.
   Define favorite/idea as a non-commitment and planned as a user-owned calendar
   record, not an organizer reservation.
2. **Planned-record data**: notes and party size belong to the planned record.
   The RFC must state their ownership, editability, and privacy posture, including
   that neither field becomes public event data.
3. **Attendance confirmation**: a user explicitly marks a planned record
   `attended` or `did-not-go`; time alone never advances it.
4. **Ratings**: permit rating only after confirmed attendance. Preserve existing
   ratings according to a chosen migration/compatibility policy rather than
   retroactively asserting attendance.
5. **Organizer booking**: preserve an external handoff. Party size is **not**
   transmitted to the organizer, and a link click must not be treated as booking
   or attendance evidence.

**Verify**: every lifecycle stage, transition owner, and rating gate has a
single explicit answer with a rationale.

### Step 3: Specify migration and user-facing copy decisions

In a migration/rollout and user-copy section, decide how existing favorites and
calendar rows map into the new lifecycle without inventing an attendance claim.
Describe the data migration, backfill default, and safe handling of existing
ratings. Record the exact user-facing terminology for “Saved idea,” “Planned,”
“Attended,” and “Didn't go,” including the confirmation prompt and the rating
availability rule.

The plan must make clear which existing UI surfaces a later implementation must
reconcile: Event Detail save/planning controls, Booking's local party-size
control, and My Events' upcoming/saved/past presentation. It must not implement
those changes.

**Verify**: legacy rows have a non-attendance default; copy does not call a past
favorite or calendar save “attended” without user confirmation.

### Step 4: End with exact backend-repo contract questions

End the RFC with `## Open questions requiring backend-repo inspection`. Keep all
unresolved backend material there and include these exact questions:

1. Should the existing `user_calendar_events` row be extended or should a new
   JWT-scoped planned-event record own `notes`, `party_size`, and
   `attendance_status`, and what uniqueness rule binds it to `(user_id, event_id)`?
2. Which RLS policies and RPCs permit the authenticated user to create, edit,
   remove, and transition only their own planned records?
3. What nullable/default migration maps current calendar rows to `planned`
   without fabricating `attended` or `did-not-go`, and how are pre-existing
   ratings retained without asserting a lifecycle transition?
4. What database enum/check constraints make `favorite/idea → planned →
   attended | did-not-go` the supported state model while allowing removal of an
   idea or plan?
5. Which endpoint/RPC returns a user's lifecycle records and safe event display
   fields without exposing another user's notes, party size, or attendance state?
6. Should rating enforcement live in the write RPC/RLS policy, and how does it
   verify a confirmed `attended` record atomically before accepting a rating?
7. What retention/deletion policy applies to private planned-record notes and
   party size when an event is removed, archived, or a user deletes their account?

**Verify**: open questions are confined to this final section, with no unresolved
technical choice hidden in a decision section.

### Step 5: Review the RFC as a documentation deliverable

Review the final RFC against the source evidence and the two RFC style examples.
Confirm it is a design contract, not a disguised partial implementation, and
that it protects the organizer-boundary and rating gate.

**Verify**: `pnpm run docs:test` → exit 0 and documentation guards pass.

## Test plan

- RFC review checklist: document structure matches the repository RFC examples
  and separates observed state, resolved lifecycle decisions, migration/copy,
  backend contract, implementation inventory, acceptance criteria, and open
  questions.
- Lifecycle checklist: every path from favorite/idea through planned to attended
  or did-not-go is defined; favorites, timestamps, and booking clicks never
  silently mean attended.
- Privacy/integration checklist: notes and party size are private planned-record
  fields; organizer booking remains an external handoff and party size is never
  transmitted.
- Rating checklist: only confirmed attendance permits a new rating, with a stated
  treatment for legacy ratings.
- Documentation verification: `pnpm run docs:test` passes. No Vitest, build, or
  `verify:web` gate applies because this spike produces an RFC only.

## Done criteria

- [ ] `docs/rfcs/2026-07-24-saved-planned-attended.md` exists and follows the repo RFC format.
- [ ] The RFC explicitly defines `favorite/idea → planned (calendar) → attended |
      did-not-go`, transition ownership, and a timestamp-independent attendance
      confirmation.
- [ ] Notes and party size are attached to the private planned record; organizer
      booking remains an external handoff and party size is not transmitted.
- [ ] Ratings are gated on confirmed attendance, with explicit migration and
      user-facing copy decisions.
- [ ] Decision sections contain no “TBD”; backend questions are confined to a
      dedicated final section.
- [ ] `pnpm run docs:test` exits 0.
- [ ] Only the RFC and plan-tracking documentation changed; no production code,
      migration, or backend contract was implemented.

## STOP conditions

- Any cited source no longer matches the Current state excerpts after the drift
  check.
- The RFC would infer attendance from time, a saved favorite, a calendar entry,
  a booking click, or external organizer behavior.
- A proposed design sends party size or notes to an organizer, or makes either
  field public event data.
- The RFC leaves a lifecycle, migration, rating, or copy decision unresolved
  outside its dedicated backend-question section.
- A web, database, or backend implementation is needed to complete this
  documentation-only spike.
- `pnpm run docs:test` fails after a documentation-only correction attempt.

## Maintenance notes

- The live booking-card path is `apps/web/src/features/events/components/event-detail/booking.tsx`;
  keep later implementation plans pointed at that component, not the nonexistent
  `pages/event-detail/booking.tsx` path.
- Calendar and favorite records currently overlap in My Events. A later
  implementation must migrate their semantics deliberately rather than merely
  renaming tabs.
- Keep organizer booking external in the first lifecycle phase. A future
  organizer integration would require separate consent, data-sharing, and failure
  handling decisions.
- Reviewer focus: confirm “Past” is no longer synonymous with “Attended,” and
  that the backend contract enforces the rating gate rather than trusting UI
  visibility alone.
