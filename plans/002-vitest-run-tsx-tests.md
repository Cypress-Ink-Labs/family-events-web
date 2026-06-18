# Plan 002: Make vitest actually run `.test.tsx` files (currently silently excluded)

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/vitest.config.ts`
> If it changed since this plan was written, compare the excerpt below against the live file before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests (test-harness bug)
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

The vitest `include` glob is `src/**/*.test.ts`, which does **not** match `.test.tsx` files. Two
test files exist and are silently never executed: `apps/web/src/features/my-events/pages/my-events.test.tsx`
and `apps/web/src/features/events/components/unsplash-attribution.test.tsx`. They were written,
committed, and pass CI green — but only because they never run. `pnpm run web:test` reports
"Test Files 52 passed" while 54 test files exist on disk. This is a correctness hole in the test
harness: any future `.test.tsx` is dead on arrival, and the two existing ones provide zero
protection today. Fixing the glob makes already-written tests count.

## Current state

`apps/web/vitest.config.ts` (verified at `4e739e4`):

```ts
  test: {
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
    environment: "node",
    include: ["src/**/*.test.ts", "../../supabase/functions/**/*.test.ts"],
    exclude: [
      "node_modules",
      "dist",
      ".git",
      "../../supabase/functions/**/node_modules/**",
      "../../supabase/functions/send-weekly-digest/**",
      "../../supabase/functions/send-push/**",
      "../../supabase/functions/send-reminders/**",
    ],
    includeTaskLocation: true,
  },
```

Facts verified:
- `environment: "node"` — there is no DOM. The two excluded `.test.tsx` files are **pure-logic**
  tests despite the extension: `my-events.test.tsx` imports `buildSavedEventIds` from `./my-events`
  and asserts on plain arrays; it does not render React. So they will pass under the Node env once
  included. (Component tests that need a DOM are a separate effort — see `plans/008`.)
- `find apps/web/src -name '*.test.ts' | wc -l` → 52; `... -name '*.test.tsx' | wc -l` → 2.
- Current `pnpm run web:test` → "Test Files 52 passed (52), Tests 379 passed".

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Run web tests | `pnpm run web:test` | exit 0, all pass |
| List run files | `pnpm --filter @cypress-ink-labs/web exec vitest list` | shows both `.test.tsx` files |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (modify only):
- `apps/web/vitest.config.ts`

**Out of scope** (do NOT touch):
- The two `.test.tsx` files themselves — do not edit them; they should pass as-is. If one fails,
  that is a real, previously-hidden bug — see STOP conditions.
- `vite.config.ts` — separate file; not used for tests.
- Do NOT change `environment: "node"` in this plan (DOM setup is `plans/008`).

## Git workflow

- Branch: `advisor/002-vitest-run-tsx-tests`
- Single commit; conventional-commit style, e.g. `test: include .test.tsx files in vitest run`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Confirm the two tsx files do not currently run

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest list 2>/dev/null | grep -c '\.test\.tsx'`
→ `0` (they are excluded today).

### Step 2: Broaden the include glob

In `apps/web/vitest.config.ts`, change the `include` array so both extensions match:

```ts
    include: ["src/**/*.test.{ts,tsx}", "../../supabase/functions/**/*.test.ts"],
```

Leave `exclude`, `env`, and `environment` unchanged.

**Verify**: `pnpm --filter @cypress-ink-labs/web exec vitest list 2>/dev/null | grep -c '\.test\.tsx'`
→ `2`.

### Step 3: Run the suite

**Verify**: `pnpm run web:test` → exit 0; the "Test Files" count is now **54** (was 52), and the
total test count is higher than 379.

## Test plan

No new tests authored here — this plan makes 2 existing test files execute. Verification is the file
count rising from 52 → 54 and the suite staying green.

## Done criteria

- [ ] `apps/web/vitest.config.ts` `include` matches `*.test.{ts,tsx}`
- [ ] `vitest list` shows `my-events.test.tsx` and `unsplash-attribution.test.tsx`
- [ ] `pnpm run web:test` exits 0 with "Test Files 54 passed"
- [ ] `pnpm run verify:web` exits 0
- [ ] Only `apps/web/vitest.config.ts` modified (`git status`)
- [ ] `plans/README.md` status row for 002 updated

## STOP conditions

Stop and report (do not improvise) if:
- After including them, either `.test.tsx` file **fails**. That means the test caught a real bug that
  was hidden by exclusion. Report the failure output; do not edit the test or source to make it pass
  without understanding the failure.
- The live `vitest.config.ts` no longer matches the excerpt above (drift).
- Including tsx pulls in unrelated files that need a DOM (would error with "document is not defined").
  If so, report it — DOM setup belongs to `plans/008`, not here.

## Maintenance notes

- `plans/008` builds on this: it adds a DOM environment and real component tests, which require this
  glob fix to run at all.
- Reviewer should confirm the file count went 52 → 54 and no test was weakened to pass.
</content>
