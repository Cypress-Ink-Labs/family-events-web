# Saved, Planned, and Attended Event Lifecycle

**Date**: 2026-07-24 (spike)
**Status**: design contract — implementation requires backend-repo inspection
**Source plan**: 045

---

## Purpose and problem

A saved event currently represents both a low-commitment idea and a possible planned outing. A
calendar save, an organizer-link click, and the passing of an event's start time are not evidence
that a family attended. Treating them as evidence makes the Past view's attendance language and
rating affordance untrustworthy.

This RFC defines a small, private, user-owned lifecycle:

```
favorite/idea → planned (calendar) → attended | did-not-go
```

It preserves the organizer boundary: the application sends users to the organizer to book; it does
not claim to reserve a ticket, does not transmit private planning details, and does not infer an
outcome from the handoff.

## Current state (verified 2026-07-24)

### Calendar records already carry a private note column

`apps/web/src/features/events/api/calendar.ts:4-35` selects `id, user_id, event_id, added_at,
notes`, and `addToCalendar(userId, eventId, notes = null)` inserts that `notes` value. The current
Event Detail caller does not use that capability: `apps/web/src/features/events/pages/event-detail.tsx:174-191`
calls its calendar toggle with only `eventId` and `isInCalendar`, then reports either “Added to your
calendar!” or “Removed from calendar”. No party size or note is supplied by that action.

### Booking party size is local presentation state

The live booking card is `apps/web/src/features/events/components/event-detail/booking.tsx`, not a
`pages/event-detail/booking.tsx` path. Its `attendees` prop drives the local counter and only
changes organizer-link copy and the displayed price (`event.price * attendees`) at lines 8-16 and
41-70. The link itself is `safeHref(event.source_url)` with a new-tab external handoff. The current
control does not persist party size, send it to the organizer, or prove either a booking or
attendance.

### My Events currently conflates saved, past, and attended

`apps/web/src/features/my-events/pages/my-events.tsx:28-35` unions favorite and calendar event IDs
into one saved set. Lines 59-72 divide that set solely by `start_datetime`, so every saved past
event enters `pastEvents`. Lines 208-246 label the empty state “Events you've attended will appear
here” and pass `onRate` to every past row. Thus a favorite or calendar save that is merely in the
past can currently appear attended and rateable.

## Decisions (resolved open questions)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Lifecycle:** `favorite/idea → planned (calendar) → attended | did-not-go`. A favorite/idea is a non-commitment bookmark. Planned is a user-owned calendar record, not an organizer reservation. | Distinguishes interest from an intentional outing without asserting external booking or attendance. |
| D2 | **Transition ownership:** the signed-in user creates or removes their favorite/idea, creates or removes their planned record, and explicitly chooses the final `attended` or `did-not-go` outcome for their own planned record. A timestamp, favorite, calendar save, organizer-link click, external organizer behavior, and browser navigation own no lifecycle transition. | The user is the only trustworthy source for a private family outcome in this product boundary. |
| D3 | **Planned-record data:** private notes and party size belong to the planned record. The signed-in owner may create and edit them while the record is planned; finalizing or removing the record retains or deletes them only under the backend retention policy. Neither field is public event data, visible to other users, or transmitted to an organizer. | Notes and party size describe a family's private plan rather than the shared event or an organizer booking. |
| D4 | **Attendance confirmation:** after an event has occurred, the user must explicitly mark a planned record **Attended** or **Didn't go**. The product may prompt for that choice when a planned event becomes past, but may not auto-select either result. A user may also remove a plan rather than record an outcome. | A past date is a prompt condition, not attendance evidence. |
| D5 | **Ratings:** a new rating is permitted only when the user has a confirmed `attended` record for that event. The backend must enforce this gate atomically; UI visibility is not sufficient. Existing ratings are retained as **legacy ratings** and are never backfilled into an attendance state or displayed as evidence that the user attended. Legacy ratings remain readable wherever ratings are currently shown, but cannot be edited or replaced until the user explicitly confirms attendance through a planned record. | Preserves historic user content without fabricating lifecycle history, while making future ratings trustworthy. |
| D6 | **Organizer booking:** booking remains an external handoff through the event's organizer URL. The app does not transmit party size, notes, identity, booking state, or attendance state to that organizer. Selecting the link is neither a booking nor attendance signal. | Avoids implying an integration, consent, or delivery guarantee that the product does not provide. |

## Backend contract (implementation invariants)

The later backend implementation must enforce at most one JWT-scoped, user-private planned
lifecycle record for each `(user_id, event_id)`.
The record must support private `notes`, private `party_size`, and an attendance state that is
unresolved while planned and terminal only when the owner explicitly chooses `attended` or
`did-not-go`.

A safe user-scoped read path must return only the requesting user's lifecycle data plus event
display fields. A lifecycle transition and a rating write must be separately authorized so a client
cannot turn a date, favorite, save, or organizer handoff into an attendance claim. No backend
operation in this lifecycle sends notes or party size to an organizer.

## Migration and rollout

### Data migration and compatibility policy

1. Existing favorite rows map to **Saved idea**. They remain non-commitment bookmarks and receive
   no attendance value.
2. Existing `user_calendar_events` rows map to **Planned**. Their existing `notes` values remain
   private planned-record notes. Their migration default is intentionally non-terminal: no existing
   calendar row is marked **Attended** or **Didn't go**, even if its event is in the past.
3. Existing ratings remain stored and visible as **legacy ratings**; their presence does not create
   a planned record or confirm attendance. A later implementation blocks editing or replacing a
   legacy rating until confirmed attendance, but does not delete it solely because no attendance
   record exists.
4. The rollout must preserve the organizer's external booking link. It must not transform local
   party size into an organizer request parameter, payload, or reservation.

### Exact user-facing terminology

| Concept | Required label and rule |
|---|---|
| Favorite/idea | **Saved idea** — “A saved idea is not a planned outing.” |
| Planned calendar record | **Planned** — “Add this event to your plans.” |
| Confirmed positive outcome | **Attended** — shown only after the user explicitly chooses it. |
| Confirmed negative outcome | **Didn't go** — shown only after the user explicitly chooses it. |
| Past planned-event prompt | **“Did you attend this event?”** with **“Attended”**, **“Didn't go”**, and **“Not now”** actions. “Not now” leaves the record planned; it does not choose an outcome. |
| Rating availability | **“You can rate this event after you mark it Attended.”** Existing legacy ratings are not labeled as attendance evidence. |

### UI surfaces for a later implementation

A later implementation must reconcile these surfaces without changing the semantics above:

- **Event Detail:** separate saving an idea from adding an event to plans; planning owns the
  private note and party-size inputs rather than the current toggle alone.
- **Booking card:** replace the current local-only party-size control at
  `apps/web/src/features/events/components/event-detail/booking.tsx` with planned-record editing
  when appropriate, while retaining the external organizer handoff and never transmitting party
  size.
- **My Events:** stop deriving attendance from the merged favorites/calendar set and time. Present
  Saved ideas, Planned events, and confirmed outcomes according to their lifecycle state; do not
  describe a generic past save as attended or expose the new rating action without confirmed
  attendance.

## Implementation inventory

This spike changes no production code, migration, RPC, RLS policy, organizer integration, or
backend contract. A future implementation needs coordinated work in the backend repository and,
after that contract exists, the Event Detail, booking-card, and My Events surfaces listed above.
It must also reconcile the existing favorite/calendar overlap deliberately rather than merely
renaming a tab.

## Acceptance criteria

- [ ] A user can keep an event as a **Saved idea** without creating a plan or attendance claim.
- [ ] A user can create, edit, and remove a private **Planned** record with private notes and party
      size; neither field is public event data or sent to an organizer.
- [ ] Only the signed-in owner can explicitly transition their planned record to **Attended** or
      **Didn't go**; no time-based or external action auto-transitions it.
- [ ] A past planned event can ask “Did you attend this event?” without treating “Not now” as an
      attendance result.
- [ ] A new rating is accepted only after an atomically verified **Attended** record; legacy
      ratings are retained without asserting attendance.
- [ ] Organizer booking remains an external handoff, and its link click, availability, or outcome
      does not alter lifecycle state.
- [ ] My Events no longer treats every past favorite or calendar row as attended or rateable.
- [ ] The final implementation supplies a JWT-scoped backend contract and tests the privacy,
      lifecycle-transition, and rating-gate invariants.

## Open questions requiring backend-repo inspection

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
