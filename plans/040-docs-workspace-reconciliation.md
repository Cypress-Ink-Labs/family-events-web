# Plan 040: Reconcile agent/design docs with the actual workspace

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/knowledge.md apps/web/AGENTS.md CLAUDE.md docs/DESIGN.md packages/design-system/README.md tests/guards/docs-coverage.test.mjs apps/web/package.json package.json .gitignore packages/design-system/scripts/gen-ios-swift.mjs packages/design-system/package.json docs/design/mocks/design-preview.html`
> If an in-scope or cited file changed since this plan was written, compare the
> "Current state" excerpts against the live file before proceeding; a mismatch
> is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The agent-facing and design-system documentation describe a workspace that has
been renamed and simplified, but several instructions still name obsolete
packages, a nonexistent mobile workspace, outdated React Router and pnpm
versions, and test/build conventions that no longer apply. These are
load-bearing instructions for contributors and automation: following them can
run nonexistent commands, import from the wrong package scope, or hand-edit
ignored build output. This plan makes the five affected docs describe the live
web-only workspace and adds a small guard against a recurrence of the old
package scope.

## Current state

`apps/web/knowledge.md:1,10-18,54-65,73-83` has several stale assertions:

```md
# Project knowledge — `@family-events/web`
...
pnpm --filter @family-events/web dev        # local dev server (Vite)
...
- `@family-events/contracts` — backend/API contract types (use for anything crossing the API).
- `@family-events/shared` — framework-neutral helpers only.
- `@family-events/design-system` — design tokens / generated UI assets.
- **Do not import** from `apps/ios`, `apps/android`, cron apps, or Supabase function source.
...
- **Tooling:** TypeScript (strict via `tsconfig.app.json`), Vite 8, React 19, React Router 7, TanStack Query 5, Zustand, Tailwind v4 (via `@tailwindcss/vite`), shadcn/ui, MapLibre + react-map-gl, Recharts, Sonner, react-hook-form + zod, Sentry.
...
  - Unit: Vitest, files `src/**/*.test.ts`, node environment, no JSX in tests.
...
- The `dist/` directory is checked in here (build output committed for the deployed image); regenerate via `pnpm build` rather than editing it.
```

The actual package scope is `@cypress-ink-labs/*`; the app uses
`react-router` `^8.2.0` at `apps/web/package.json:47`; unit tests are colocated
`*.test.ts` (node) and `*.test.tsx` with a `// @vitest-environment jsdom`
docblock where DOM rendering is needed; and `.gitignore:3,13` ignores `dist`
and `apps/web/dist/`. The import-ban bullet names nonexistent `apps/ios`,
`apps/android`, and cron-app directories; the generated-files and
Supabase-client rules in `knowledge.md:73-77` must remain verbatim.

`apps/web/AGENTS.md:50-55` tells workers to run commands that do not exist in
the root `package.json:6-31`:

```text
For changes touching shared packages or generated design tokens, also run the relevant mobile checks when generated outputs affect mobile:

pnpm run verify:ios
pnpm run verify:android
```

`CLAUDE.md:14` hardcodes an obsolete package-manager version:

```md
Package manager: `pnpm@11.7.0`. Node workspaces: `apps/*`, `packages/*`.
```

The live pin is `pnpm@11.15.1` in `package.json:5`, so this line should instead
point readers to `package.json`'s `packageManager` field.

`docs/DESIGN.md:93-99` claims the token build writes Swift output below a
nonexistent app directory:

```md
- `apps/web/src/styles/tokens.generated.css` — CSS custom properties consumed by Tailwind 4 via `@theme inline`
- `packages/design-system/src/generated/tokens.ts` — TypeScript mirror for programmatic access
- `apps/ios/...` — Swift constants for iOS parity
```

The generator's active output is
`packages/design-system/scripts/gen-ios-swift.mjs:5-6`:

```js
// Primary: dist/ artifact shipped in npm tarball and consumed by mobile sync workflow.
const OUTPUT = path.join(DIST_ROOT, "ios", "Tokens.swift")
```

`packages/design-system/package.json:6-16` exports and packages both mobile
artifacts at `./dist/ios/Tokens.swift` and `./dist/android/Tokens.kt`; the docs
must name those package-owned outputs rather than `apps/ios/...`.

`packages/design-system/README.md:1,3,20-24,31-34,48,53` repeats the old scope
and obsolete app destination:

```md
# @family-events/design-system
Single source of truth for visual tokens. Feeds both `apps/web` (CSS vars) and `apps/ios` (Swift constants) via codegen.
...
├── gen-ios-swift.mjs        → apps/ios/Packages/FEDesignSystem/Sources/FEDesignSystem/Generated/Tokens.swift
...
pnpm --filter @family-events/design-system build
...
- **TS** — Import `{ designTokens }` from `@family-events/design-system` for programmatic access.
- Visual mock: [`docs/design/mocks/design-preview.html`](../../docs/design/mocks/design-preview.html)
```

The current package name is `@cypress-ink-labs/design-system`. The linked
`docs/design/mocks/design-preview.html` file does **not** exist, so delete that
reference rather than retaining a dead link. Retain the real web output and
update the mobile wording to describe `dist/ios/Tokens.swift` and
`dist/android/Tokens.kt` as package artifacts for external mobile consumers.

The existing docs guard at `tests/guards/docs-coverage.test.mjs:1-28` reads
files with `readFileSync`, then uses node:test and `assert.match` assertions:

```js
function read(filePath) {
  return readFileSync(filePath, "utf8")
}

test("README documents required web workspace domains", () => {
  const readme = read(readmePath)
  assert.match(readme, /^## Web Workspace$/m)
  assert.match(readme, /^## Shared Package$/m)
  assert.match(readme, /^## Design System Package$/m)
  assert.match(readme, /^## Workflows$/m)
})
```

Follow this style for a dedicated test that reads the five docs and uses an
assertion preventing `@family-events/` from appearing in any of them.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0 |
| Web tests | `pnpm run web:test` | exit 0 |
| Web build | `pnpm run web:build` | exit 0 |
| Workspace guards | `pnpm run workspace:test` | exit 0 |
| Docs guard | `pnpm run docs:test` | exit 0 |
| Dead-code scan | `pnpm knip` | completes without a newly introduced finding |
| Dependency audit | `pnpm audit` | reports the current dependency audit result |

## Scope

**In scope**:
- `apps/web/knowledge.md` — correct package scope, Router version, test facts,
  and ignored-`dist` fact; remove only the import-ban bullet for nonexistent
  app/cron directories while preserving the Supabase-client and generated-files
  rules verbatim.
- `apps/web/AGENTS.md` — remove the nonexistent `verify:ios` and
  `verify:android` instructions.
- `CLAUDE.md` — replace the hardcoded pnpm version with a reference to
  `package.json`'s `packageManager` field.
- `docs/DESIGN.md` — document package-owned Swift/Kotlin outputs under
  `packages/design-system/dist/`.
- `packages/design-system/README.md` — correct scope, commands, output paths,
  and imports; delete the nonexistent design-preview mock link.
- `tests/guards/docs-coverage.test.mjs` — add the scope-regression assertion
  following its existing node:test/assertion pattern.

**Out of scope**:
- `README.md`, which already has accurate web-only topology guidance.
- `docs/DEVELOPMENT.md`, RFCs, package names, package version pins, and build
  tooling behavior.
- Creating `docs/design/mocks/design-preview.html` or any app/mobile workspace.
- Altering the existing generated-files or Supabase-client rules in
  `apps/web/knowledge.md`.

## Git workflow

- Branch: `advisor/040-docs-workspace-reconciliation`
- Conventional Commits, e.g. `docs: reconcile workspace guidance with current topology`.
- Do **not** push or open a PR.

## Steps

### Step 1: Revalidate every documented fact and guard convention

Run the drift check, then read all cited files. Confirm the live package names,
pnpm pin, `react-router` version, ignored `dist` paths, token-generator
locations, package exports/files, and the missing preview mock. Read
`tests/guards/docs-coverage.test.mjs` before editing it and preserve its
`node:test` plus `assert` style.

**Verify**: `grep -rn "@family-events/" apps/web/knowledge.md apps/web/AGENTS.md CLAUDE.md docs/DESIGN.md packages/design-system/README.md` shows the known stale matches before the edit, and `pnpm run docs:test` exits 0 before the edit.

### Step 2: Correct the web and agent guidance

In `apps/web/knowledge.md`, replace every `@family-events/*` workspace package
name with its `@cypress-ink-labs/*` counterpart; change React Router 7 to React
Router 8; state both supported colocated Vitest forms (`*.test.ts` in node and
`*.test.tsx` with a jsdom docblock for DOM tests); and replace the checked-in
`dist/` claim with the fact that build output is ignored. Remove the single
import-ban bullet for nonexistent iOS, Android, and cron apps. Preserve the
existing generated-files and Supabase-client rules word-for-word.

In `apps/web/AGENTS.md`, remove the mobile verification paragraph and its two
nonexistent commands. In root `CLAUDE.md`, replace the hardcoded pnpm version
with wording that says to see `package.json`'s `packageManager` field.

**Verify**: `grep -rn "@family-events/\|React Router 7\|verify:ios\|verify:android\|pnpm@11.7.0\|dist/.*checked in" apps/web/knowledge.md apps/web/AGENTS.md CLAUDE.md` returns no matches.

### Step 3: Correct the design-system documentation and remove the dead link

Update `docs/DESIGN.md` to list the generated Swift and Kotlin outputs as
`packages/design-system/dist/ios/Tokens.swift` and
`packages/design-system/dist/android/Tokens.kt`, explaining that the package
ships them for external mobile consumers. Update `packages/design-system/README.md`
to use `@cypress-ink-labs/design-system` in its heading, commands, and import
example; replace the obsolete iOS application path with the package `dist`
artifact paths; and delete the `docs/design/mocks/design-preview.html` reference
because the target does not exist.

**Verify**: `grep -rn "@family-events/\|apps/ios/Packages\|design-preview.html" docs/DESIGN.md packages/design-system/README.md` returns no matches.

### Step 4: Add the package-scope regression guard

Extend `tests/guards/docs-coverage.test.mjs` with path constants for the five
in-scope docs and one node:test case. Read each document through the existing
`read()` helper and assert that it does not contain `@family-events/`; include
the file path or name in the assertion message so a future stale reference is
actionable. Do not refactor unrelated guard tests.

**Verify**: `pnpm run docs:test` exits 0 and `grep -rn "@family-events/" apps/web/knowledge.md apps/web/AGENTS.md CLAUDE.md docs/DESIGN.md packages/design-system/README.md` returns no matches.

### Step 5: Run documentation and workspace guards

Run both documentation-specific and aggregate workspace guard commands after
all edits. Do not amend unrelated docs to make a guard pass.

**Verify**: `pnpm run docs:test` exits 0 and `pnpm run workspace:test` exits 0.

## Test plan

- Extend `tests/guards/docs-coverage.test.mjs` with a focused test that fails
  when `@family-events/` occurs in any of the five reconciled docs.
- Keep the guard deterministic and filesystem-only, using the existing
  `readFileSync`/node:test/assert pattern.
- Verify the docs with `pnpm run docs:test` and the full guard suite with
  `pnpm run workspace:test`.
- Use the stale-scope grep as an explicit regression check in addition to the
  executable guard.

## Done criteria

- [ ] The five documentation files use `@cypress-ink-labs/*` where applicable;
  none contains `@family-events/`.
- [ ] `apps/web/knowledge.md` says React Router 8, documents node and jsdom
  Vitest test forms, states that `dist` is ignored, and no longer bans imports
  from nonexistent app/cron directories.
- [ ] The Supabase-client and generated-files rules in `knowledge.md` remain
  unchanged.
- [ ] `apps/web/AGENTS.md` no longer instructs `verify:ios` or `verify:android`.
- [ ] `CLAUDE.md` points to `package.json` `packageManager`, not a hardcoded pnpm version.
- [ ] `docs/DESIGN.md` and `packages/design-system/README.md` name the package
  `dist/ios/Tokens.swift` and `dist/android/Tokens.kt` artifacts; the missing
  design-preview link is removed.
- [ ] The docs guard rejects `@family-events/` in all five documents.
- [ ] `pnpm run docs:test` and `pnpm run workspace:test` exit 0.
- [ ] Only the six in-scope files are modified for this plan.
- [ ] `plans/README.md` status row is updated.

## STOP conditions

- Any cited package name, version, test convention, generator output, or
  `.gitignore` entry differs from the Current state excerpts after the drift
  check.
- `docs/design/mocks/design-preview.html` exists after the drift check; retain
  and validate the link instead of deleting it, then report the drift.
- Removing the nonexistent import-ban bullet would alter the Supabase-client or
  generated-files rules; preserve those rules exactly.
- The existing docs guard uses a materially different test/assertion convention
  than the Current state excerpt; do not introduce a second guard style.
- `pnpm run docs:test` or `pnpm run workspace:test` fails twice after a
  reasonable correction restricted to this plan's scope.
- Code does not match the Current state excerpts after the drift check.

## Maintenance notes

- The new stale-scope guard intentionally covers only the five reconciled docs.
  When another agent-facing document is edited or created, use the current
  `@cypress-ink-labs/*` scope and consider extending this list in the same PR.
- Keep pnpm version guidance indirect through `package.json`'s `packageManager`
  field so Renovate version bumps cannot leave a duplicate stale number.
- The package `dist/ios` and `dist/android` outputs are publishable artifacts,
  not in-repo native application directories. External mobile synchronization
  owns their consumption.
- The missing `docs/design/mocks/design-preview.html` link is deliberately
  deleted, not recreated; a future visual mock should be added only with a
  real maintained artifact.
