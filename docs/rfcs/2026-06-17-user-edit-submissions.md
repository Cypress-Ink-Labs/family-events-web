# User Edit/Delete of Own Event Submissions

**Date**: 2026-06-17 (spike) · **fleshed to build-ready 2026-06-18**
**Status**: design — ready to build (blocked on backend RPCs)
**Source plan**: 012 · [CIL-73](https://linear.app/hexsleeves/issue/CIL-73)
**Related**: [013 / CIL-74](https://linear.app/hexsleeves/issue/CIL-74) (the `/submissions` surface this builds on)

---

## Problem

Users who submit community events via `submit_community_event` can only create — there is no path to
edit or delete their own submission afterward. After submitting, `submit-event.tsx` navigates away
and the event leaves the submitter's hands. Admins hold full CRUD via `admin_update_event` /
`admin_create_event`. In a closed beta, the inability to fix a typo or cancel a submission generates
support load and discourages future submissions.

## Current State

Verified against the live tree (post plans 001–018):

**Submission lifecycle**

1. `features/events/pages/submit-event.tsx` calls `supabase.rpc("submit_community_event", {...})`
   (line 34) with eleven fields, then `navigate("/explore")` (line 53).
2. The RPC inserts an `events` row with `status = "draft"` (`EventStatus` union in
   `shared/types.ts:36`).
3. The row carries `submitted_by` — the ownership anchor (contracts `database.types.ts:908`).
4. Admins review via `features/admin/pages/admin-event-edit.tsx` → `admin_update_event`
   (sets `status`, carries `p_decision_reason`); also `admin_create_event` and
   `admin_unlock_event_fields`. Admin edit route is `/admin/events/:eventId/edit`.
5. **No user-scoped read, edit, or delete RPC exists.** The client cannot be the ownership
   boundary — that lives in Supabase RLS in the backend repo.

**Form component** — `features/events/components/submit-event-form.tsx`

- Exports `SubmitEventForm`, `CommunityEventFormData`, and `communityEventSchema` (zod).
- Props today: `{ cityId, onSubmit, isSubmitting }` — **create-only, no prefill**.
- ⚠️ State is held in **11 internal `useState("")` calls** seeded to empty (lines 82–93). Adding
  prefill is **not** a zero-logic change (the original spike under-stated this): the state must be
  seeded from props. See "Form refactor" below.

## Decisions (resolved open questions)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| D1 | Which states are user-editable | **`draft` only** (edit + cancel). `published`/`rejected`/`archived` are locked | Once an admin acts, user changes must go through an admin — avoids silent edits to live events |
| D2 | Delete semantics | **Soft-delete → `status = 'archived'`** via `cancel_user_community_event` | Preserves audit history; invisible to public queries. Hard-delete only if a PII-erasure pipeline is later required |
| D3 | Reset LLM review on edit | **Yes — RPC nulls `llm_review_*` and re-queues** | Stale LLM flags would mislead the admin reviewing edited content |
| D4 | Concurrency with admin edits | **Optimistic concurrency on `updated_at`**; RPC rejects if the row changed since load | Prevents user/admin clobber. Simpler than locking |
| D5 | Admin-locked fields | RPC **rejects edits to any field in `admin_locked_fields`** | Don't overwrite intentional admin corrections |
| D6 | Edit after rejection | **No** at launch. Future: "Edit & resubmit" creates a fresh draft copy | Keeps rejected events terminal; resubmit-as-copy is a separate scope |
| D7 | Rate limiting | `update_user_community_event` rate-limited **separately** (~10 edits/day) | Submit RPC already caps 5/day; edits need their own cap |
| D8 | Edit route path | **`/submissions/:id/edit`** (protected), not `/events/:id/edit` | `/events/:id` is a **public** route; nesting the edit under the protected submissions surface avoids the public clash and anchors discovery |
| D9 | Notify admin on user edit | Out of scope for v1; rely on the LLM re-queue (D3) putting it back in the review flow | Avoids extra notification plumbing now |

## Backend contract (separate repo — blocks web work)

**`update_user_community_event`**

```
update_user_community_event(
  p_event_id   uuid,
  p_title      text,
  p_description text | null,
  p_start_datetime timestamptz,
  p_end_datetime   timestamptz | null,
  p_venue_name text | null,
  p_address    text | null,
  p_city_id    uuid,
  p_age_min    int | null,
  p_age_max    int | null,
  p_is_free    bool,
  p_price      numeric | null,
  p_expected_updated_at timestamptz   -- optimistic concurrency (D4)
) returns events
```

Preconditions (server-enforced): `submitted_by = auth.uid()`; `status = 'draft'`;
`events.updated_at = p_expected_updated_at` (else raise a conflict); no edited field is in
`admin_locked_fields` (D5). On success: update mutable fields, **null the `llm_review_*` set and
re-queue review** (D3), return the row.

**`cancel_user_community_event(p_event_id uuid) returns void`** — same `submitted_by`/`draft`
preconditions; transitions `status → 'archived'` (D2).

**Read path** — reuse `get_user_submissions` from [013](https://linear.app/hexsleeves/issue/CIL-74)
for the list, plus a detail read for the edit form. Add
**`get_user_submission(p_event_id uuid) returns events`** (JWT-scoped to `submitted_by = auth.uid()`,
`draft` only) so the form can prefill every editable field including ones the public RPC omits.

## Editable-state matrix

| Status | User edit | User cancel |
|--------|-----------|-------------|
| `draft` | ✅ | ✅ |
| `published` | ❌ contact admin | ❌ contact admin |
| `rejected` | ❌ closed | ❌ closed |
| `archived` | ❌ closed | ❌ closed |

## Web implementation

### Form refactor (`submit-event-form.tsx`)

Extend props to support edit mode:

```ts
interface SubmitEventFormProps {
  cityId: string | undefined
  onSubmit: (data: CommunityEventFormData) => Promise<void>
  isSubmitting: boolean
  initialValues?: Partial<CommunityEventFormData>  // NEW
  submitLabel?: string                              // NEW ("Submit for Review" | "Save changes")
}
```

Seed the 11 `useState` calls from `initialValues` via lazy initializers, e.g.
`useState(() => initialValues?.title ?? "")` and split `start_datetime`/`end_datetime` back into the
date/time inputs. The form stays uncontrolled internally; only the initial seed changes. If a single
form instance must switch between create/edit targets, remount with a `key={eventId ?? "new"}`.

### Data hooks — `features/events/hooks/use-submission-mutations.ts` (new)

```ts
export function useUpdateUserSubmission(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { eventId: string; data: CommunityEventFormData; expectedUpdatedAt: string }) => {
      const { error } = await supabase.rpc("update_user_community_event", {
        p_event_id: vars.eventId,
        p_expected_updated_at: vars.expectedUpdatedAt,
        p_title: vars.data.title,
        /* …remaining p_ fields, mapping "" → undefined like submit-event.tsx… */
      })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.submissions.byUser(userId) })
    },
  })
}

export function useCancelUserSubmission(userId: string | undefined) { /* cancel_user_community_event */ }
```

Surface errors with `humanizeSupabaseError`; map the concurrency conflict to a clear "This event
changed since you opened it — reload to see the latest." message.

### Route + page

- `app-route-pages.ts`: lazy `EditSubmissionPage` from `features/events/pages/edit-submission.tsx`.
- `app-router.tsx`: add `{ path: "/submissions/:id/edit", element: <FeatureErrorBoundary featureName="Edit Submission"><EditSubmissionPage /></FeatureErrorBoundary> }`
  inside the **ProtectedRoute → AppLayout** children.
- `EditSubmissionPage`: read `:id`; `get_user_submission(id)`; if not found/owned/`draft` → locked
  state ("This submission can no longer be edited."). Otherwise render `SubmitEventForm` with
  `initialValues` + `submitLabel="Save changes"` + a destructive "Cancel submission" action
  (confirm dialog → `useCancelUserSubmission`). The client owner/`draft` check is **UX-only**; the
  RPC is the real gate.

### Entry points (on the 013 `/submissions` surface)

Each `draft` row gets **Edit** (→ `/submissions/:id/edit`) and **Cancel submission** actions. A
`not-approved` row may later offer "Edit & resubmit" (D6, future).

## Test plan

- **Unit**: `CommunityEventFormData` → `p_` param mapping (incl. `"" → undefined`, free/price logic);
  concurrency-conflict error → friendly message.
- **Component** (jsdom, plan 008 infra): `SubmitEventForm` prefilled from `initialValues` renders
  existing values; `EditSubmissionPage` locked state for non-draft/non-owner; cancel confirm dialog
  fires `cancel_user_community_event`.
- **E2E** (best-effort, live env): submit → edit a field → save → row reflects change; cancel → row
  shows "Archived".

## Acceptance criteria

- [ ] `update_user_community_event` (with `updated_at` guard + admin-lock reject + LLM re-queue) and
      `cancel_user_community_event` exist and are JWT/`draft` scoped.
- [ ] `get_user_submission` returns a draft only to its owner.
- [ ] `/submissions/:id/edit` prefills the form; saves via the update RPC; locks non-editable states.
- [ ] Cancel soft-deletes (`status='archived'`); the row leaves public queries.
- [ ] Concurrency conflicts surface a clear reload message (no silent clobber).
- [ ] Form-mapping unit + edit-page component tests pass under `verify:web`.

## Phased rollout

1. Backend RPCs + RLS + rate limit (M, backend repo).
2. `SubmitEventForm` prefill refactor + mutation hooks (S).
3. `/submissions/:id/edit` page + cancel action (S).
4. Wire Edit/Cancel actions into the 013 `/submissions` rows (S) — ships together with CIL-74.

## Effort

- Backend: 3 RPCs (`update`, `cancel`, `get_user_submission`) + RLS + tests — **M** (2–3 days).
- Web: form prefill + edit route + cancel — **S** (~1 day), assuming the 013 surface exists.

## Cross-references

- [CIL-73 / Plan 012](https://linear.app/hexsleeves/issue/CIL-73) — this spike's source plan.
- [CIL-74 / Plan 013](https://linear.app/hexsleeves/issue/CIL-74) — the `/submissions` surface and
  `get_user_submissions` read path this RFC builds on. Build both in one sprint.
