# Plan 037: Consolidate event imagery on the canonical resolver

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/src/features/admin/components/admin-event-review-panel.tsx apps/web/src/features/dashboard/components/dashboard/dashboard-today-section.tsx apps/web/src/features/events/pages/event-detail.tsx apps/web/src/features/events/lib/event-card-media.ts apps/web/src/features/events/lib/event-card-media.test.ts`
> If any cited file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

Event image selection is a correctness boundary: a supplied image must be safe,
and a missing or unsafe image needs the deterministic, tag-aware fallback at the
right requested dimensions. Three UI surfaces duplicate that sequence. Future
changes to image validation or fallback rules can leave the duplicates behaving
differently from event cards, rows, and plan cards that already use the canonical
resolver. Reusing the tested helper makes every surface share one policy without
altering presentation dimensions.

## Current state

`apps/web/src/features/events/lib/event-card-media.ts:12-26` is the tested,
canonical resolver. It extracts tag slugs and returns the first safe image or a
deterministic fallback at caller-supplied dimensions:

```ts
export function resolveEventImageUrl(
  event: Pick<EventWithDetails, "id" | "images" | "tags">,
  width: number,
  height: number
): string {
  return (
    safeImageSrc(event.images?.[0]) ??
    getFallbackImageUrl(event.id, eventTagSlugs(event), width, height)
  )
}
```

`apps/web/src/features/events/lib/event-card-media.test.ts:43-109` already
covers valid HTTP(S) images, unsafe schemes, no-image fallbacks, width/height
propagation, deterministic output, and tag-aware fallback selection. No new
helper behavior needs testing.

The three duplicated implementations use these exact dimensions:

- `apps/web/src/features/admin/components/admin-event-review-panel.tsx:80-87`
  derives `heroImage` with `safeImageSrc` and `getFallbackImageUrl` at **900 ×
  360**:

  ```ts
  const heroImage =
    safeImageSrc(event.images?.[0]) ??
    getFallbackImageUrl(
      event.id,
      (event.tags ?? []).map((t) => t.tag.slug),
      900,
      360
    )
  ```

  Its `safeImageSrc` import shares a line with `safeHref`; `safeHref` is still
  used at `apps/web/src/features/admin/components/admin-event-review-panel.tsx:143-145`
  for the external source link and must remain.

- `apps/web/src/features/dashboard/components/dashboard/dashboard-today-section.tsx:55-69`
  passes the same inline image expression to `SmartImage` at **200 × 200**:

  ```tsx
  src={
    safeImageSrc(event.images?.[0]) ??
    getFallbackImageUrl(
      event.id,
      (event.tags ?? []).map((t) => t.tag.slug),
      200,
      200
    )
  }
  ```

- `apps/web/src/features/events/pages/event-detail.tsx:143-151` builds
  `imageUrl` for the detail hero at **800 × 500**:

  ```ts
  const imageUrl =
    safeImageSrc(currentEvent.images?.[0]) ??
    getFallbackImageUrl(
      currentEvent.id,
      (currentEvent.tags ?? []).map((t) => t.tag.slug),
      800,
      500
    )
  ```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web tests | `pnpm run web:test` | all tests pass |
| Web check | `pnpm run web:check` | exit 0 |
| Dead-code scan | `pnpm knip` | no newly introduced unused imports |

## Scope

**In scope**:
- `apps/web/src/features/admin/components/admin-event-review-panel.tsx`
- `apps/web/src/features/dashboard/components/dashboard/dashboard-today-section.tsx`
- `apps/web/src/features/events/pages/event-detail.tsx`

**Out of scope**:
- `apps/web/src/features/events/lib/event-card-media.ts` and its tests — the
  canonical helper and its behavioral coverage already exist.
- `apps/web/src/features/events/lib/fallback-images.ts` and
  `apps/web/src/infrastructure/safe-url.ts`.
- Image dimensions, `SmartImage`, image upload, and any new wrapper or re-export.

## Git workflow

- Branch: `advisor/037-canonical-event-image-resolver`
- Conventional Commits, e.g. `chore(web): reuse canonical event image resolver`.
- Do NOT push or open a PR.

## Steps

### Step 1: Reconfirm the resolver contract and all caller dimensions

Run the drift command from the preamble. Re-read the canonical helper and the
three callers, then record their existing dimension pairs exactly: admin review
`900, 360`; dashboard today `200, 200`; event detail `800, 500`. Confirm that
the helper accepts each caller's event shape and that its existing tests cover
safe-image and fallback behavior.

**Verify**: `pnpm run web:test` → the existing `event-card-media.test.ts` passes
as part of the web test suite before changing callers.

### Step 2: Replace the admin review duplication

Import `resolveEventImageUrl` from `@/features/events/lib/event-card-media` and
replace the multi-line `heroImage` expression with:

```ts
const heroImage = resolveEventImageUrl(event, 900, 360)
```

Remove only `safeImageSrc` from the existing `safeHref, safeImageSrc` import and
remove the fallback-image import. Keep `safeHref` because the source-link guard
still calls it.

**Verify**: `pnpm run web:check` → exit 0 with no unused imports in the admin
review component.

### Step 3: Replace the dashboard and detail duplications

In the dashboard today section, use
`resolveEventImageUrl(event, 200, 200)` as the `SmartImage` source. In event
detail, use `resolveEventImageUrl(currentEvent, 800, 500)` for `imageUrl`.
Remove the now-unused `safeImageSrc` and `getFallbackImageUrl` imports in each
file, and add the canonical-helper import. Do not otherwise change components,
props, or image dimensions.

**Verify**: `pnpm run web:check` → exit 0; `pnpm run web:test` → all tests pass,
including `event-card-media.test.ts`.

### Step 4: Confirm the clean cutover

Search source imports and calls to ensure no inline caller remains outside the
canonical resolver and fallback implementation. The only remaining textual
`getFallbackImageUrl` occurrences under `apps/web/src` must be in
`fallback-images.ts` and `event-card-media.ts`.

**Verify**: `grep -rn "getFallbackImageUrl" apps/web/src` → only
`apps/web/src/features/events/lib/fallback-images.ts` and
`apps/web/src/features/events/lib/event-card-media.ts` remain.

## Test plan

- No new tests: `event-card-media.test.ts` already pins the canonical resolver's
  safe-image, fallback, dimensions, determinism, and tag behavior.
- Run `pnpm run web:test` after the cutover to keep that regression suite green.
- Run `pnpm run web:check` to catch import/type errors, then perform the
  `getFallbackImageUrl` grep to prove all three duplicated caller paths are gone.

## Done criteria

- [ ] Admin review calls `resolveEventImageUrl(event, 900, 360)` and retains
  `safeHref` for its source link.
- [ ] Dashboard today calls `resolveEventImageUrl(event, 200, 200)`.
- [ ] Event detail calls `resolveEventImageUrl(currentEvent, 800, 500)`.
- [ ] No newly unused `safeImageSrc` or `getFallbackImageUrl` imports remain in
  the three call sites.
- [ ] `pnpm run web:check` and `pnpm run web:test` exit 0.
- [ ] `grep -rn "getFallbackImageUrl" apps/web/src` reports only
  `fallback-images.ts` and `event-card-media.ts`.

## STOP conditions

- The cited code does not match the "Current state" excerpts after the drift
  check.
- A call site needs behavior not covered by `resolveEventImageUrl`, such as a
  different image source or nonstandard fallback policy; stop instead of adding
  a second resolver or wrapper.
- Replacing a call changes its required width or height from `900 × 360`,
  `200 × 200`, or `800 × 500`.
- `web:check`, the canonical resolver tests, or the clean-cutover grep fails
  after a focused correction.

## Maintenance notes

- Keep image-selection policy centralized in `resolveEventImageUrl`; new event
  surfaces should call it with their explicitly chosen render dimensions.
- The dimensions are a presentation contract of each existing surface, not a
  reason to make the resolver infer layout.
- `safeHref` in the admin review panel remains intentionally independent of
  image resolution because it validates the event's external source URL.
