# Plan 011: Consolidate event-card variants behind a shared base (start with the duplicated image/price logic)

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/src/features/events/components/event-card apps/web/src/features/plan/components apps/web/src/features/my-events/components/event-row.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but landing `plans/008` first lets you add component tests; this plan can also ship
  with pure-helper tests only)
- **Category**: tech-debt
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

There are at least seven renderers of "an event as a card/row" and they re-implement the same derived logic:
image-with-fallback resolution, start-date parsing, price formatting, tag/age badges, and the favorite
button. A bug fix or accessibility change (e.g. image alt handling, fallback sizing) must be applied in
4+ files in lockstep, and the variants have already begun to drift. There is partial structure
(`event-card/_shared.ts` defines `EventCardVariantProps`), so the cleanest first move is to extract the
**duplicated pure logic** into shared helpers and have all variants consume them — without forcing a single
mega-component that over-constrains the visually-distinct layouts.

> This plan extracts shared *logic*, not a unified visual component. It deliberately keeps the distinct
> layouts (compact/list/featured/row/hero/thumb) as separate components that compose the shared helpers.

## Current state

Verified at `4e739e4`. The duplicated derivation, copied across files:

`apps/web/src/features/my-events/components/event-row.tsx` (lines ~22–31):
```ts
const imageUrl =
  safeImageSrc(event.images?.[0]) ??
  getFallbackImageUrl(event.id, (event.tags ?? []).map((t) => t.tag.slug), 200, 200)
const startDate = new Date(event.start_datetime)
```

`apps/web/src/features/plan/components/plan-thumb-card.tsx` (lines ~23–29):
```ts
const imageUrl =
  safeImageSrc(event.images?.[0]) ??
  getFallbackImageUrl(event.id, (event.tags ?? []).map((t) => t.tag.slug), 640, 360)
```

The same pattern appears in `event-card/{default,compact,list,featured}-card.tsx` and
`plan-hero-card.tsx`. Shared imports already common to these files: `safeImageSrc` from
`@/infrastructure/safe-url`, `getFallbackImageUrl` from `@/features/events/lib/fallback-images`,
`formatEventPrice` from `@/shared/utils/format`, `SmartImage` from `@/shared/components/motion`,
`TagBadge`/`AgeRangeBadge` from `@/features/events/components/tag-badge`, `FavoriteButton`.

Existing shared scaffolding: `apps/web/src/features/events/components/event-card/_shared.ts` defines
`EventCardVariant`, `EventCardVariantProps`, `EventCardVariant` union. `event-card.tsx` is the dispatcher
that picks a variant. Note the fallback image dimensions differ per variant (200×200 row, 640×360 thumb) —
the helper must take size params, not hard-code them.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck/lint/format | `pnpm run web:check` | exit 0 |
| Web unit tests | `pnpm run web:test` | exit 0, all pass |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope**:
- Create a shared helper module, e.g. `apps/web/src/features/events/lib/event-card-media.ts` (pure
  functions): `resolveEventImageUrl(event, width, height)` and any other pure derivation duplicated
  verbatim (e.g. tag-slug extraction). Co-locate a `.test.ts`.
- Update the card/row components to call the helper instead of inlining the logic:
  `event-card/{default,compact,list,featured}-card.tsx`, `plan-thumb-card.tsx`, `plan-hero-card.tsx`,
  `event-row.tsx`.

**Out of scope** (do NOT do):
- Do NOT merge the distinct layouts into one component or change any card's rendered markup/visual output.
- Do NOT change the fallback image dimensions per variant (preserve 200×200, 640×360, etc. exactly).
- Do NOT touch `safe-url.ts`, `fallback-images.ts`, `tag-badge.tsx`, or `FavoriteButton` internals.
- Do NOT change `_shared.ts`'s public types unless strictly required (if you do, update all consumers).

## Git workflow

- Branch: `advisor/011-consolidate-event-cards`
- Commit per unit: (1) helper + test, (2) migrate consumers.
- Conventional-commit style, e.g. `refactor(events): extract shared event-card media helper`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Inventory the exact duplicated expressions

Read all seven files and list every expression that is byte-identical (modulo size args). Confirm the image
resolution and tag-slug extraction are the common core. Record the per-file size arguments.

### Step 2: Write the pure helper + test FIRST (characterization)

Create `event-card-media.ts`:
```ts
import type { EventWithDetails } from "@/shared/types"
import { safeImageSrc } from "@/infrastructure/safe-url"
import { getFallbackImageUrl } from "@/features/events/lib/fallback-images"

export function eventTagSlugs(event: EventWithDetails): string[] {
  return (event.tags ?? []).map((t) => t.tag.slug)
}

export function resolveEventImageUrl(event: EventWithDetails, width: number, height: number): string {
  return safeImageSrc(event.images?.[0]) ?? getFallbackImageUrl(event.id, eventTagSlugs(event), width, height)
}
```
Add `event-card-media.test.ts` (Node env, pure): a primary image present → returned as-is via `safeImageSrc`;
no images → fallback url built with the given width/height and tag slugs; missing `tags` → empty slug list.
Model on an existing lib test such as `apps/web/src/features/events/lib/event-filters.test.ts` or
`apps/web/src/lib/events/group-by-city.test.ts`.

**Verify**: `pnpm run web:test` → the new test passes.

### Step 3: Migrate consumers one file at a time

In each of the seven components, replace the inlined image/tag-slug logic with a call to the helper, passing
that file's existing width/height. Keep everything else identical. After each file, typecheck.

**Verify after each**: `pnpm run web:check` → exit 0. The rendered output must be unchanged (same image URLs
for the same inputs — the helper is a pure extraction).

### Step 4: Confirm no duplicated expression remains

**Verify**: `grep -rn "getFallbackImageUrl(event.id" apps/web/src/features` → only inside
`event-card-media.ts` (consumers now call the helper, not `getFallbackImageUrl` directly). Any remaining
direct call is a consumer you missed.

## Test plan

- New pure-helper test (`event-card-media.test.ts`) as above — runs on Node env, no DOM needed.
- If `plans/008` (component-test infra) has landed, optionally add a smoke render test for one card variant
  asserting it shows the resolved image; otherwise the pure-helper test plus unchanged-output verification
  suffices.
- Verification: `pnpm run web:test` → all pass including the new helper test.

## Done criteria

- [ ] `event-card-media.ts` exists with `resolveEventImageUrl` + `eventTagSlugs`, covered by a passing test
- [ ] All seven card/row components call the helper; no component inlines `getFallbackImageUrl(event.id, ...)`
- [ ] No card's visual output / fallback dimensions changed (pure extraction)
- [ ] `pnpm run web:check` exits 0; `pnpm run web:test` exits 0; `pnpm run verify:web` exits 0
- [ ] Changes confined to the in-scope files (`git status`)
- [ ] `plans/README.md` status row for 011 updated

## STOP conditions

Stop and report (do not improvise) if:
- The "duplicated" logic turns out to differ subtly between files (different fallback args beyond width/height,
  different `safeImageSrc` handling) — extract only what is genuinely identical; report the divergences rather
  than forcing a lossy unification.
- A consumer's types don't match `EventWithDetails` (e.g. `plan-*-card` uses a `PlannedEvent` type) — confirm
  the helper's parameter type covers it (PlannedEvent may extend/contain the needed fields); if not, widen the
  helper signature minimally or skip that consumer and report.
- Migrating a file changes its rendered output in any way — STOP; this must be behavior-preserving.

## Maintenance notes

- **Follow-up (larger)**: a shared `EventCardBase` with slot composition for the markup itself — deferred;
  this plan only unifies the derivation logic, which is the safe, high-value first slice.
- Reviewer: diff each consumer to confirm the change is a pure substitution with identical size args.
- `plan-*-card.tsx` operate on `PlannedEvent` — watch that the helper's type stays compatible if `PlannedEvent`
  diverges from `EventWithDetails`.
</content>
