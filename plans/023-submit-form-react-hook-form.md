# Plan 023: Migrate the community-event submission form to react-hook-form

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 37234b7..HEAD -- apps/web/src/features/events/components/submit-event-form.tsx`
> If it changed since this plan was written, compare the "Current state" excerpt
> against the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/020 (its `submit-event-form.test.tsx` must be updated by this plan)
- **Category**: tech-debt
- **Planned at**: commit `37234b7`, 2026-06-18

## Why this matters

The app has two form patterns. The admin event editor uses **react-hook-form**
(`react-hook-form@^7.79.0`, already a dependency) with `zodResolver` and shared
field components. The community submission form hand-rolls eleven `useState`
calls plus a manual `safeParse`. Two patterns means new forms must pattern-match
the wrong one, error UX drifts, and the manual form is harder to extend (e.g.
prefill — see RFC 012). Converging the submission form onto the established
react-hook-form pattern removes the odd-one-out and makes RFC 012's edit/prefill
work straightforward.

## Current state

`apps/web/src/features/events/components/submit-event-form.tsx` (309 lines):

- Exports `communityEventSchema` (zod, lines 11-23), `CommunityEventFormData`
  (`z.infer`, line 25), and `SubmitEventForm`.
- Props (lines 27-31): `{ cityId: string | undefined; onSubmit: (data: CommunityEventFormData) => Promise<void>; isSubmitting: boolean }`.
- State: eleven `useState` calls (lines 82-93) seeded to `""`/`true`; a manual
  `handleSubmit` (lines 95-129) builds `start_datetime`/`end_datetime` from
  separate date/time inputs, runs `communityEventSchema.safeParse`, maps zod
  issues into a `Record<string,string>` error map, and calls `onSubmit(result.data)`.

The target pattern — admin editor — lives at
`apps/web/src/features/admin/components/admin-event-edit-form.tsx` and its field
components under `apps/web/src/features/admin/components/admin-event-edit/`. It
uses `useForm({ resolver: zodResolver(schema) })`, `react-hook-form` field
registration, and renders errors from `formState.errors`. **Read it before
starting and match its structure** (resolver setup, error rendering, submit
wiring).

Consumer: `apps/web/src/features/events/pages/submit-event.tsx:90-94` renders
`<SubmitEventForm cityId={selectedCity?.id} onSubmit={handleSubmit} isSubmitting={isSubmitting} />`.
The public prop contract (those three props + the exported `communityEventSchema`
/ `CommunityEventFormData`) must be preserved so the consumer and any tests keep
working.

### The date/time nuance (do not lose this behavior)

The schema field `start_datetime` is a single string, but the UI collects a
separate **date** and **start time** (and optional **end time**), combining them
as `` `${startDate}T${startTime}:00` ``. Whatever form library wiring you use,
preserve this split-inputs → combined-string mapping exactly; it is the
load-bearing transform.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck (web) | `pnpm --filter @cypress-ink-labs/web run typecheck` | exit 0 |
| Run tests (filter) | `pnpm --filter @cypress-ink-labs/web exec vitest run <path>` | all pass |
| Lint (web) | `pnpm --filter @cypress-ink-labs/web run lint` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |

## Suggested executor toolkit

- Read `apps/web/src/features/admin/components/admin-event-edit-form.tsx` and the
  `admin-event-edit/_shared.ts` helper before writing — reuse the same
  `zodResolver` + field-registration idiom rather than inventing one.

## Scope

**In scope**:
- `apps/web/src/features/events/components/submit-event-form.tsx` (rewrite internals)
- `apps/web/src/features/events/components/submit-event-form.test.tsx` (update to the new form API — created by plan 020)

**Out of scope** (do NOT change behavior or signature):
- The exported `communityEventSchema` and `CommunityEventFormData` — keep identical.
- The `SubmitEventForm` prop contract (`cityId`, `onSubmit`, `isSubmitting`).
- `submit-event.tsx` (the page/consumer) — it must keep working untouched.
- RFC 012's `initialValues` prefill prop — that is a separate plan; do NOT add it here.

## Git workflow

- Branch: `advisor/023-submit-form-react-hook-form`
- Conventional Commits, e.g. `refactor(events): migrate submit form to react-hook-form`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Rebuild the form internals on react-hook-form

Replace the eleven `useState`s and the manual `safeParse`/error-map with
`useForm<CommunityEventFormData>({ resolver: zodResolver(communityEventSchema) })`,
matching the admin editor's idiom. Register each field; render validation errors
from `formState.errors` (replacing the manual `errors` record). On valid submit,
call the existing `onSubmit` prop with the parsed data. **Preserve** the
date+time split-input → `start_datetime` string mapping and the free/price gating.
Keep the JSX structure/markup and class names so the visual output is unchanged.

**Verify**: `pnpm --filter @cypress-ink-labs/web run typecheck` → exit 0; `pnpm --filter @cypress-ink-labs/web run lint` → exit 0.

### Step 2: Update the form test

Update `submit-event-form.test.tsx` (from plan 020) to the new form API: valid
submit calls `onSubmit` once with parsed data; invalid submit surfaces
react-hook-form errors and does not call `onSubmit`; the price field gates on the
free toggle. If plan 020 has not landed yet, create this test now.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest run src/features/events/components/submit-event-form.test.tsx` → all pass.

### Step 3: Confirm the consumer still works

Do not edit `submit-event.tsx`. Confirm it type-checks and (if `submit-event.test.tsx`
from plan 020 exists) its tests still pass against the unchanged prop contract.

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- Update/author `submit-event-form.test.tsx`: valid → `onSubmit` called with
  parsed `CommunityEventFormData`; invalid → errors shown, `onSubmit` not called;
  free/price gating. Pattern: `admin-event-edit-form.test.tsx`.
- Verification: `pnpm run verify:web` → all pass.

## Done criteria

- [ ] `submit-event-form.tsx` uses `useForm` + `zodResolver(communityEventSchema)`; no `useState` form-field state remains (`grep -c "useState" apps/web/src/features/events/components/submit-event-form.tsx` → 0, or only non-field state if any)
- [ ] Exported `communityEventSchema`, `CommunityEventFormData`, and the `SubmitEventForm` prop signature are unchanged
- [ ] `submit-event.tsx` is NOT modified (`git status`)
- [ ] `pnpm run verify:web` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- The form's live code diverges from the excerpt (drift since `37234b7`).
- Preserving the date/time split mapping under react-hook-form would require
  changing `communityEventSchema` — STOP; the schema is out of scope.
- The consumer `submit-event.tsx` would need changes to keep compiling — STOP;
  the prop contract must stay stable.
- Verification fails twice after a reasonable fix attempt.

## Maintenance notes

- After this lands, RFC 012's edit/prefill work adds an `initialValues` prop —
  with react-hook-form that becomes `useForm({ defaultValues })`, much simpler
  than seeding eleven `useState`s. Note this in the PR as the follow-on.
- Reviewer: scrutinize that visual markup/classes are unchanged and the
  date/time combination logic is preserved byte-for-byte in behavior.
