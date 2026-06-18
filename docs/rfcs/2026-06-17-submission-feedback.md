# Submission Status and Rejection Feedback for Submitting Users

## Problem

When a user submits a community event, the app runs an LLM-assisted review and stores a structured
result — status, decision, human-readable reason, and a list of flags. Admins see all of this
through the `LlmReviewSummary` component. The submitter sees nothing: `submit-event.tsx` calls
`submit_community_event`, shows a success toast, then navigates to `/explore`. There is no "my
submissions" page, no post-submit confirmation, and no mechanism for the submitter to learn whether
their event was approved, rejected, or is still under review.

In a closed beta this creates a silent failure mode. A rejected event never appears on `/explore`,
and the submitter has no way to distinguish "still pending" from "silently rejected". Surfacing
status and rejection reasons builds submitter trust, reduces support load, and improves future
submission quality by explaining what went wrong.

## Current State

### Review fields stored on the event row

Verified at commit `4e739e4` against `apps/web/src/shared/types.ts` (lines 138–148) and the
upstream `@cypress-ink-labs/contracts` package (version 0.0.3, `database.types.ts`):

| Field | Type | Purpose |
|---|---|---|
| `llm_review_status` | `"not_required" \| "pending" \| "succeeded" \| "failed" \| "skipped"` | Whether the LLM review ran and how it ended |
| `llm_review_decision` | `"approve" \| "reject" \| "needs_admin_review"` | The LLM's verdict |
| `llm_review_reason` | `string \| null` | Human-readable explanation of the decision |
| `llm_review_flags` | `string[]` | Machine-readable flag slugs (e.g. policy violation categories) |
| `llm_review_confidence` | `number \| null` | Model confidence score |
| `llm_review_error` | `string \| null` | Error detail when `llm_review_status = "failed"` |
| `status` | `"draft" \| "published" \| "rejected" \| "archived"` | Canonical event lifecycle status |
| `submitted_by` | `string \| null` | UUID of the authenticated user who submitted |

The `submitted_by` column is the ownership field. Its presence is confirmed in the generated DB
types (contracts `database.types.ts` line 908).

### Who can read these fields today

Admins call `admin_events_enriched` (an RPC that returns all LLM review fields). The public
`events_enriched` RPC returns only `status`, `title`, and other display fields — it does **not**
return `llm_review_*` fields or `submitted_by`. No client-scoped RPC or view exists that lets a
user query their own submissions and receive review data.

**Conclusion: a new backend RPC (or an RLS-secured direct table query) is required.** There is no
existing path for a user to read their own submissions with review status. The backend repo must add
either:

- A new RPC `get_user_submissions(p_user_id uuid)` that enforces `submitted_by = auth.uid()` at
  the database level and returns the subset of fields safe to expose to the submitter, or
- A row-level security policy on the `events` table granting each user `SELECT` on their own rows
  (where `submitted_by = auth.uid()`), accompanied by a Supabase direct table query in the web
  client.

The RPC approach is preferred: it lets the backend control which review fields are returned to the
submitter (specifically, the reason but not raw internal metadata such as `llm_review_model` or
`llm_review_prompt_version`).

### What admins see (via `LlmReviewSummary`)

`apps/web/src/features/admin/components/admin-event-review/llm-review-summary.tsx` renders:
status, decision, confidence, reviewed-at, reason, flags, provider/model, prompt version, and
error. All of this is appropriate for admin debugging but the provider/model/prompt-version and
raw flags are internal implementation details that should not be exposed verbatim to submitters.

## Proposed User-Facing Surface

### Surface location: dedicated `/submissions` route (recommended over profile section)

A "My Submissions" section bolted onto `ProfilePage` (`apps/web/src/features/profile/pages/profile.tsx`)
would work for a small list, but a standalone `/submissions` route is preferred for the following
reasons:

1. `ProfilePage` already has six distinct sections; adding a paginated list makes it unwieldy.
2. `plans/012` proposes an edit entry point for own submissions — that edit flow naturally links
   back to a dedicated submissions list, not a sub-section of a settings page.
3. A dedicated route is independently navigable, shareable, and bookmarkable.
4. Post-submit confirmation can link directly to `/submissions` without requiring a deep-link into
   the profile page's scroll position.

The profile page should show a prominent link or pill badge ("My Submissions — 2 pending") that
navigates to `/submissions`. This keeps the profile page from growing while still surfacing the
page to users who do not know it exists.

### What each row shows

Each submission row renders:

- **Title** (truncated at ~80 chars)
- **Event date** (`start_datetime`, formatted as "Jun 21 at 10:00 AM")
- **Submission status chip**: derived from the combination of `status` and `llm_review_decision`:

  | `status` | `llm_review_decision` | Shown to user |
  |---|---|---|
  | `draft` | any | Pending review |
  | `draft` | `needs_admin_review` | Under manual review |
  | `published` | any | Approved — view event link |
  | `rejected` | any | Not approved |
  | `archived` | any | Archived |

- **Rejection detail** (collapsed by default, shown only when status chip is "Not approved"):
  the value of `llm_review_reason`, rendered in a collapsible `<details>` or accordion element.
  The raw `llm_review_flags` slugs are NOT shown verbatim — a display mapping or omission is
  preferred (see open questions).

- **Submitted on** date (`created_at`).

### Empty state

When a user has no submissions: "You haven't submitted any events yet. Submit one and it'll appear
here after review." with a link to `/submit`.

### Post-submit confirmation

After a successful `submit_community_event` call, instead of navigating to `/explore`, the page
should navigate to `/submissions` (or a transient `/submissions?submitted=true` that triggers a
visible "Thank you — we'll review your event" banner). This gives the submitter an immediate anchor
to check back on their submission.

The current success toast ("Event submitted! Our team will review it shortly.") can be kept as a
secondary confirmation alongside the navigation change.

## Open Questions and Risks

1. **Which fields to expose to submitters.** `llm_review_reason` is a natural-language string
   written to be human-readable; it is appropriate to expose. `llm_review_flags` are machine
   slugs (e.g. `policy_violation`, `duplicate_event`) that could be mapped to friendly labels or
   omitted. The raw model/provider/prompt-version metadata should not be shown to submitters —
   exposing model internals creates a gaming surface and is not useful to the submitter.

2. **Does showing a rejection reason invite gaming?** A submitter who learns "rejected: duplicate
   event" will resubmit with minor edits. Whether that is acceptable is a product decision. The
   alternative (showing "not approved" with no reason) is less transparent but harder to game.

3. **Privacy of review internals.** Confidence scores, provider names, and model versions are
   operational metadata. Exposing them leaks pricing/vendor signals and could be used to reverse-
   engineer the review pipeline. The proposed RPC should strip these fields at the database layer.

4. **RLS policy scope.** If using a direct table query rather than an RPC, the RLS policy must
   allow `SELECT` only on rows where `submitted_by = auth.uid()` and only return columns that are
   safe for the submitter to see. The simpler choice is an RPC with an explicit `RETURNS` set.

5. **Pairing with a resubmit/edit flow.** A "Not approved" row that shows a reason is most
   useful when the submitter can act on it. `plans/012` designs the edit-submission surface; the
   two plans should be built in the same sprint so that rejected-with-reason rows can offer an
   "Edit and resubmit" action rather than a dead end.

6. **Pagination.** Most beta submitters will have 1–5 submissions. Simple `LIMIT 50` with a "show
   more" fallback is sufficient at launch; cursor pagination matches `events_enriched` and can be
   added later.

7. **Real-time updates.** Supabase realtime could push a status change when an event is approved
   or rejected, allowing the submissions page to update without a refresh. This is a nice-to-have;
   a polling refresh or manual reload is acceptable for a v1.

## Rough Build Effort

| Work item | Effort |
|---|---|
| Backend: new RPC `get_user_submissions` + RLS scope | S–M (backend repo) |
| Web: `useUserSubmissions` hook + query key | S |
| Web: `/submissions` route + page component | M |
| Web: `SubmissionRow` display component + status mapping | S |
| Web: post-submit navigation change in `submit-event.tsx` | S |
| Web: profile page link/badge to `/submissions` | S |

Total web estimate: M. Backend coordination required before any web work can land.

## Cross-References

- `plans/012`: designs user edit/delete of own submissions; shares the `/submissions` surface as
  the entry point for the edit action. These two plans should be built together to avoid shipping
  a dead-end rejection-reason display with no follow-up action.
- `plans/013` (this document): design only; no source code changed.
