# Submission Status and Rejection Feedback for Submitting Users

**Date**: 2026-06-17 (spike) · **fleshed to build-ready 2026-06-18**
**Status**: design — ready to build (blocked on one backend RPC)
**Source plan**: 013 · [CIL-74](https://linear.app/hexsleeves/issue/CIL-74)
**Related**: [012 / CIL-73](https://linear.app/hexsleeves/issue/CIL-73) (edit/cancel — shares this surface)

---

## Problem

When a user submits a community event, the app runs an LLM-assisted review and stores a structured
result — status, decision, human-readable reason, and a list of flags. Admins see all of this
through the `LlmReviewSummary` component. The submitter sees nothing: `submit-event.tsx` calls
`submit_community_event`, shows a success toast, then navigates to `/explore`. There is no "My
Submissions" page, no post-submit confirmation, and no mechanism for the submitter to learn whether
their event was approved, rejected, or is still under review.

In a closed beta this is a silent failure mode. A rejected event never appears on `/explore`, and
the submitter cannot distinguish "still pending" from "silently rejected". Surfacing status and
rejection reasons builds submitter trust, reduces support load, and improves future submission
quality by explaining what went wrong.

## Current State

### Review fields stored on the event row

Verified against `apps/web/src/shared/types.ts` (lines 138–148) and `@cypress-ink-labs/contracts`
(v0.0.3, `database.types.ts`):

| Field | Type | Purpose |
|---|---|---|
| `llm_review_status` | `"not_required" \| "pending" \| "succeeded" \| "failed" \| "skipped"` | Whether the LLM review ran and how it ended |
| `llm_review_decision` | `"approve" \| "reject" \| "needs_admin_review"` | The LLM's verdict |
| `llm_review_reason` | `string \| null` | Human-readable explanation of the decision |
| `llm_review_flags` | `string[]` | Machine-readable flag slugs (e.g. policy categories) |
| `llm_review_confidence` | `number \| null` | Model confidence score |
| `llm_review_error` | `string \| null` | Error detail when `llm_review_status = "failed"` |
| `status` | `"draft" \| "published" \| "rejected" \| "archived"` | Canonical event lifecycle status |
| `submitted_by` | `string \| null` | UUID of the authenticated user who submitted |

`submitted_by` is the ownership anchor (confirmed in contracts `database.types.ts` line 908).

### Who can read these fields today

- Admins call `admin_events_enriched` (returns all `llm_review_*` fields).
- The public `events_enriched` RPC returns only display fields (`status`, `title`, …) — **not**
  `llm_review_*` or `submitted_by`.
- **No client-scoped path exists** for a user to read their own submissions with review data.

### Routing / surfaces that exist

- `/submit-event` (note: **not** `/submit`) → `SubmitEventPage`, protected, under `AppLayout`
  inside `ProtectedRoute` (`apps/web/src/app/app-router.tsx:142`).
- No `/submissions` route. `ProfilePage` already renders six sections.

## Decisions (resolved open questions)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| D1 | Surface location | **Dedicated `/submissions` route** + a pill link on the profile page | Profile already has 6 sections; a list is independently navigable/bookmarkable and is the natural target for the post-submit redirect and the 012 edit entry point |
| D2 | Read path | **New backend RPC `get_user_submissions`** (not a raw RLS table query) | RPC lets the backend pick exactly which review fields are returned and strip internal metadata at the DB layer |
| D3 | Which review fields to expose | `status`, `llm_review_decision`, `llm_review_reason`, derived chip only. **Hide** confidence, model, provider, prompt-version, raw error | Model internals are a gaming surface + leak vendor/pricing signal; not useful to submitters |
| D4 | Show rejection reason at all? | **Yes — show `llm_review_reason`** in a collapsed accordion on "Not approved" rows | Transparency reduces support load; mild gaming risk accepted for a closed beta (revisit if abused) |
| D5 | `llm_review_flags` | **Do not render raw slugs.** Omit at launch; optional friendly-label map later | Slugs (`policy_violation`) are internal and unfriendly |
| D6 | Post-submit behavior | Navigate to `/submissions?submitted=1` (banner) instead of `/explore`; keep success toast | Gives the submitter an anchor to check status |
| D7 | Pagination | `LIMIT 50` + "show more" at launch; cursor later | Beta submitters have 1–5 submissions |
| D8 | Realtime | Out of scope for v1 (manual reload / refetch on focus) | Nice-to-have; not worth the realtime channel cost yet |

## Backend contract (separate repo — blocks web work)

**`get_user_submissions()` → `setof user_submission`**

```
get_user_submissions() returns table (
  id                  uuid,
  title               text,
  start_datetime      timestamptz,
  status              event_status,        -- draft | published | rejected | archived
  llm_review_decision text,                -- approve | reject | needs_admin_review | null
  llm_review_reason   text,                -- nullable; safe natural-language reason only
  created_at          timestamptz
)
```

- Enforces `submitted_by = auth.uid()` inside the function (no parameter — derive from JWT; do not
  trust a client-supplied user id).
- Returns **only** the columns above — confidence/model/provider/prompt-version/error are never
  selected, so they cannot leak.
- Orders by `created_at desc`, `LIMIT 50` (add cursor param later).

## Web implementation

### 1. Query key (`infrastructure/queries/query-keys.ts`)

Add to `qk`:

```ts
submissions: {
  all: ["submissions"] as const,
  byUser: (userId: string | undefined) => ["submissions", nil(userId)] as const,
},
```

### 2. Data hook — `features/events/hooks/use-user-submissions.ts` (new)

Mirror the `useNotificationPreferences` pattern (`useQuery` + `enabled: !!userId`):

```ts
export interface UserSubmission {
  id: string
  title: string
  start_datetime: string
  status: Event["status"]
  llm_review_decision: "approve" | "reject" | "needs_admin_review" | null
  llm_review_reason: string | null
  created_at: string
}

export function useUserSubmissions(userId: string | undefined) {
  return useQuery({
    queryKey: qk.submissions.byUser(userId),
    queryFn: async (): Promise<UserSubmission[]> => {
      if (!userId) return []
      const { data, error } = await supabase.rpc("get_user_submissions")
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })
}
```

### 3. Pure status mapping — `features/events/lib/submission-status.ts` (new, unit-tested)

```ts
export type SubmissionChip =
  | "pending" | "under-review" | "approved" | "not-approved" | "archived"

export function toSubmissionChip(
  status: Event["status"],
  decision: UserSubmission["llm_review_decision"],
): SubmissionChip {
  switch (status) {
    case "published": return "approved"
    case "rejected":  return "not-approved"
    case "archived":  return "archived"
    case "draft":     return decision === "needs_admin_review" ? "under-review" : "pending"
  }
}
```

| chip | label | tone |
|---|---|---|
| `pending` | Pending review | muted |
| `under-review` | Under manual review | info |
| `approved` | Approved · view event | success |
| `not-approved` | Not approved | destructive |
| `archived` | Archived | muted |

### 4. Route wiring

- `app/app-route-pages.ts`: `export const SubmissionsPage = lazy(() => import("@/features/events/pages/submissions").then(m => ({ default: m.SubmissionsPage })))`
- `app/app-router.tsx`: add under the existing `ProtectedRoute` → `AppLayout` children block (next
  to `/submit-event`):
  ```tsx
  { path: "/submissions",
    element: <FeatureErrorBoundary featureName="My Submissions"><SubmissionsPage /></FeatureErrorBoundary> }
  ```
- Import `SubmissionsPage` in the `app-route-pages` barrel import list in `app-router.tsx`.

### 5. Components — `features/events/pages/submissions.tsx` + `components/`

- `SubmissionsPage`: `useAuth()` → `useUserSubmissions(user?.id)`; render loading / empty / list;
  read `?submitted=1` to show a one-time "Thank you — we'll review your event" banner.
- `SubmissionRow`: title (truncate ~80), `start_datetime` ("Jun 21 at 10:00 AM"), `SubmissionStatusChip`,
  `created_at`. On `not-approved`, a collapsible `<details>`/accordion showing `llm_review_reason`.
  On `approved`, a link to `/events/:id`. (012 adds Edit/Cancel actions on `draft` rows here.)
- Empty state: "You haven't submitted any events yet." + link to `/submit-event`.

### 6. Post-submit nav (`features/events/pages/submit-event.tsx`)

Change line 53 `navigate("/explore")` → `navigate("/submissions?submitted=1")`. Keep the success
toast as secondary confirmation.

### 7. Profile pill (`features/profile/pages/profile.tsx`)

Add a link/badge ("My Submissions — N pending") that routes to `/submissions`. Pending count =
submissions where `toSubmissionChip(...) === "pending" | "under-review"`.

## Test plan

- **Unit** (`submission-status.test.ts`): every `(status, decision)` combination → expected chip
  (exhaustive table). Runs in the default Node vitest env.
- **Component** (`submissions.test.tsx`, jsdom docblock per plan 008 infra): loading skeleton;
  empty state with `/submit-event` link; list renders N rows; `not-approved` row expands to show
  the reason; `?submitted=1` shows the banner. Mock `useUserSubmissions`.
- **E2E** (best-effort, needs live Supabase + a seeded draft): submit → lands on `/submissions` →
  row visible with "Pending review".

## Acceptance criteria

- [ ] `get_user_submissions` RPC exists, JWT-scoped, returns only the 7 safe columns.
- [ ] `/submissions` route renders for authed users; loading/empty/list states all covered.
- [ ] Rejected rows show `llm_review_reason`; confidence/model/provider/flags never reach the client.
- [ ] Submitting redirects to `/submissions?submitted=1` with a banner.
- [ ] Profile shows a "My Submissions" pill with a pending count.
- [ ] `submission-status` unit tests + `submissions` component tests pass under `verify:web`.

## Phased rollout

1. **Backend**: ship `get_user_submissions` (S–M).
2. **Web read-only**: hook + status lib + `/submissions` page + profile pill + post-submit redirect (M).
3. **012 actions**: edit/cancel buttons on `draft` rows land on top of this surface — see CIL-73.

## Effort

| Work item | Effort |
|---|---|
| Backend RPC + RLS scope | S–M (backend repo) |
| `useUserSubmissions` hook + query key | S |
| `submission-status` pure lib + tests | S |
| `/submissions` route + page + row/chip components | M |
| Post-submit redirect + profile pill | S |

Total web: **M**. Backend RPC must land first.

## Cross-references

- [CIL-73 / Plan 012](https://linear.app/hexsleeves/issue/CIL-73) — edit/cancel of own submissions;
  consumes this `/submissions` surface as its entry point. Build in the same sprint so a
  "Not approved" row offers "Edit & resubmit" instead of a dead end.
