# Plan 010: Make `components/v2` the canonical primitive set and write the missing `docs/DESIGN.md`

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/src/components/v2 apps/web/src/shared/components/ui docs`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / docs
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

The codebase has two coexisting primitive systems: `apps/web/src/components/v2/*` (the newer mobile-first
layout vocabulary, ~26 usages) and `apps/web/src/shared/components/ui/*` (the established Radix/shadcn
wrappers, ~314 usages). The v2 index comment says "new code should compose from `v2/*`" and points to
`docs/DESIGN.md` + `docs/design/mocks/design-preview.html` for rationale — **but neither doc exists**. So
the stated migration has no reference, adoption has stalled, and new code defaults back to the old system.
This plan makes the intended direction real: write the missing design doc, and add a guard that flags *new*
direct `shared/components/ui` imports outside already-migrated code (without forcing a big-bang migration).

## Current state

Verified at `4e739e4`:
- `apps/web/src/components/v2/index.ts` header comment:
  ```
  /**
   * v2 design-system primitives.
   * ... new code should compose from `v2/*` instead.
   * See `docs/DESIGN.md` for the rationale + `docs/design/mocks/design-preview.html`
   * for visual reference.
   */
  ```
  Exports: `Page`, `Stack`, `Toolbar`, `FormGrid`, `FilterBar` (+ `_tokens.ts`).
- `ls docs/DESIGN.md` → does not exist. `docs/design/mocks/design-preview.html` → does not exist.
- v2 primitives wrap tokens + Tailwind; e.g. `v2/page.tsx` is a width/padding container ("Replaces ad-hoc
  `max-w-5xl mx-auto px-4`").
- `shared/components/ui/*` are CVA + Radix wrappers (e.g. `button.tsx` uses `class-variance-authority` +
  `radix-ui` Slot). v2 is layout vocabulary; ui is component vocabulary — they are **complementary**, not
  fully overlapping. The doc must state the actual relationship, not pretend v2 replaces all of ui.
- Guard tests live in `tests/guards/*.mjs` (Node `node:test`); existing ones enforce boundaries
  (`domain-boundaries.test.mjs`, `shared-boundary.test.mjs`). A new guard would follow that pattern.
- `docs:test` runs `tests/guards/docs-coverage.test.mjs` — read it; it may govern which docs must exist.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Docs guard | `pnpm run docs:test` | exit 0 |
| Workspace guards | `pnpm run workspace:test` | exit 0 |
| Web check | `pnpm run web:check` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope**:
- `docs/DESIGN.md` (create) — the rationale + v1(ui)→v2 relationship + when to use which.
- `apps/web/src/components/v2/index.ts` — fix the dangling reference (point only to docs that now exist;
  drop the `design-preview.html` reference unless you also create it).
- **Optional, only if low-risk**: a new guard `tests/guards/v2-adoption.test.mjs` that asserts a *baseline*
  set of files/areas already on v2 don't regress to `shared/components/ui` layout imports — see Step 3.

**Out of scope** (do NOT do):
- A bulk migration of the 314 `shared/components/ui` usages — explicitly NOT this plan. This plan establishes
  direction + docs + (optionally) a non-regression guard, nothing more.
- Deleting or rewriting any `shared/components/ui/*` or `v2/*` component.
- Creating `design-preview.html` (visual mock) — out of scope; remove the reference instead.

## Git workflow

- Branch: `advisor/010-v2-canonical-design-doc`
- Commit per unit: (1) `docs/DESIGN.md` + fix v2 index comment, (2) optional guard.
- Conventional-commit style, e.g. `docs: add DESIGN.md and clarify v2 vs ui primitives`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read both systems and the docs guard

Read `apps/web/src/components/v2/index.ts` and each v2 component, skim a representative
`shared/components/ui/*` (e.g. `button.tsx`, `card.tsx`), and read `tests/guards/docs-coverage.test.mjs`.
Determine the *actual* relationship (v2 = layout/page vocabulary; ui = interactive components) so the doc is
accurate.

### Step 2: Write `docs/DESIGN.md`

Cover, factually:
- The two systems and their distinct roles (layout vocabulary vs component primitives) — do not overstate
  that v2 replaces ui where they don't overlap.
- When new code should use `v2/*` (page/layout structure) vs `shared/components/ui/*` (buttons, inputs, etc.).
- The migration stance: per-route, incremental; old `ui` primitives remain.
- A short list of the current v2 exports and what each replaces (e.g. `Page` replaces ad-hoc
  `max-w-* mx-auto px-*` wrappers; `Stack` replaces ad-hoc flex/gap stacks).
- Where design tokens come from (`packages/design-system` → `apps/web/src/styles/tokens.generated.css`).

Then update the `v2/index.ts` comment so it references only `docs/DESIGN.md` (remove the
`design-preview.html` pointer, since that file is out of scope).

**Verify**: `test -f docs/DESIGN.md` → exit 0; `grep -c "design-preview.html" apps/web/src/components/v2/index.ts`
→ `0`.

### Step 3 (optional, low-risk only): Non-regression guard

If — and only if — you can do it without false positives, add `tests/guards/v2-adoption.test.mjs` that
encodes a baseline: files/dirs already composed from `v2/*` should not introduce new layout via
`shared/components/ui`. Model it on `tests/guards/domain-boundaries.test.mjs`. If a clean, low-false-positive
rule isn't obvious, SKIP this step and note it as a follow-up — do not ship a flaky guard.

If you add it, wire it into the `workspace:test` script list in root `package.json` (the same list the other
guards are in).

**Verify**: `pnpm run workspace:test` → exit 0 (including the new guard if added).

### Step 4: Full gate

**Verify**: `pnpm run docs:test && pnpm run web:check` → exit 0; `pnpm run verify:web` → exit 0.

## Test plan

- No app unit tests. If Step 3's guard is added, it IS the test — it must pass and not false-positive on
  current code (run it against the unchanged tree first).
- Verification is the docs/workspace guard suites staying green with the new doc + comment fix.

## Done criteria

- [ ] `docs/DESIGN.md` exists and accurately describes v2 vs ui roles and the migration stance
- [ ] `v2/index.ts` no longer references a non-existent doc
- [ ] If a guard was added, it passes and is wired into `workspace:test`; if skipped, that's noted in the PR
- [ ] `pnpm run docs:test` exits 0; `pnpm run workspace:test` exits 0; `pnpm run verify:web` exits 0
- [ ] No `shared/components/ui/*` or `v2/*` component was modified
- [ ] `plans/README.md` status row for 010 updated

## STOP conditions

Stop and report (do not improvise) if:
- `tests/guards/docs-coverage.test.mjs` enforces a doc structure your `DESIGN.md` conflicts with.
- A non-regression guard can't be written without flagging existing, legitimate code — skip it (don't force it).
- You find v2 and ui actually DO heavily overlap (v2 duplicates interactive components), changing the doc's
  premise — report the real picture rather than documenting an inaccurate relationship.

## Maintenance notes

- **Follow-up**: the actual per-route migration of `shared/components/ui` layout usages to `v2/*` is separate
  and larger; this plan only sets direction + docs.
- Reviewer: confirm `DESIGN.md` describes reality, not aspiration, and that no big migration snuck in.
</content>
