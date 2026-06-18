# Plan 008: Stand up component-test infrastructure and cover auth guards + admin edit form

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/vitest.config.ts apps/web/package.json apps/web/src/features/auth/components apps/web/src/features/admin/components/admin-event-edit-form.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/002` (vitest must run `.test.tsx` first)
- **Category**: tests
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

Several security-sensitive React components have **zero** test coverage and **cannot** be tested today
because the unit-test runner has no DOM environment and no rendering library. The auth route guards
(`ProtectedRoute`, `PublicOnlyRoute`) decide who sees protected pages; the OAuth callback redirect logic
guards against open redirects; the admin event-edit form writes production event data. Their *pure* logic
is partly extracted and tested (e.g. `access-control.ts`, `event-editor-mappers.ts`), but the components
that wire those decisions are untested. This plan adds a jsdom + React Testing Library setup (the standard,
minimal stack) and the first batch of component tests over the highest-risk guards/forms.

> This plan deliberately establishes infrastructure + a *starter* set of tests, not exhaustive coverage.
> Additional component tests are a follow-on once the harness exists.

## Current state

Verified at `4e739e4`:
- `apps/web/vitest.config.ts` has `environment: "node"` and (after `plans/002`) `include`
  `src/**/*.test.{ts,tsx}`. There is **no** `setupFiles`, no jsdom/happy-dom, no
  `@testing-library/react` in `apps/web/package.json` devDependencies.
- `@vitejs/plugin-react` IS already a devDependency (used by `vite.config.ts`), so JSX transform for tests
  is available once wired into the vitest config.
- Existing test style: pure-function tests with `vitest` (`describe`/`it`/`expect`), see
  `apps/web/src/shared/access-control.test.ts` and `apps/web/src/features/my-events/pages/my-events.test.tsx`.
- Components to cover (all verified small and prop/hook-driven):
  - `apps/web/src/features/auth/components/protected-route.tsx` — `useAuth()` → `{user, isEnabled, isLoading}`;
    renders a spinner while loading, `<Navigate to="/sign-in" state={{from: location.pathname}}>` when
    `!user || !isEnabled`, else `<Outlet/>`.
  - `apps/web/src/features/auth/components/public-only-route.tsx` — redirects authed+enabled users to
    `resolveInAppRedirectTarget(location.state?.from)`, else renders `<Outlet/>`.
  - `apps/web/src/features/auth/pages/oauth-callback.tsx` — `safeNext(?next)` (already a pure local fn that
    rejects non-`/` and `//` targets), navigates to `next` when a session exists, and after an 8s timeout
    with no session navigates to `/sign-in?oauth_failed=1`.
  - `apps/web/src/features/admin/components/admin-event-edit-form.tsx` — form state + dirty tracking; calls
    the editor mappers (`event-editor-mappers.ts`, which already has `event-editor-mappers.test.ts`).
- `useAuth`/`useAuthStore` come from `apps/web/src/features/auth/stores/auth-store.ts` (Zustand) — tests
  will need to mock these (via `vi.mock`) or drive the store.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Web unit tests | `pnpm run web:test` | exit 0, all pass |
| Typecheck/lint/format | `pnpm run web:check` | exit 0 |
| Full gate | `pnpm run verify:web` | exit 0 |
| Bundle-budget guard | `pnpm run workspace:test` | exit 0 (confirm devDeps don't trip a guard) |

## Suggested executor toolkit

- React Testing Library docs for `render`, `screen`, and router testing with `react-router` v7
  (`createMemoryRouter` / `MemoryRouter`). The app uses `react-router` (not `react-router-dom`).

## Scope

**In scope**:
- `apps/web/package.json` — add devDeps: `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`
  (and `@testing-library/user-event` if needed). Pin versions compatible with React 19 / Vitest 4.
- `apps/web/vitest.config.ts` — add the React plugin, a jsdom environment (scoped via `environmentMatchGlobs`
  or a second project so existing Node tests are unaffected — see Step 2), and a `setupFiles` entry.
- `apps/web/vitest.setup.ts` (create) — import `@testing-library/jest-dom`.
- New test files (create):
  - `apps/web/src/features/auth/components/protected-route.test.tsx`
  - `apps/web/src/features/auth/components/public-only-route.test.tsx`
  - `apps/web/src/features/auth/pages/oauth-callback.test.tsx`
  - `apps/web/src/features/admin/components/admin-event-edit-form.test.tsx`

**Out of scope** (do NOT touch):
- The components/pages under test — this plan only adds tests + infra, no behavior changes.
- `pnpm-lock.yaml` beyond what `pnpm install` updates for the new devDeps.
- Converting existing Node-env pure tests to jsdom — leave them on Node for speed (see Step 2).
- E2E (`apps/web/e2e/`) — unchanged.

## Git workflow

- Branch: `advisor/008-component-test-infra`
- Commit per logical unit: (1) infra + setup, (2) auth guard tests, (3) oauth-callback test, (4) admin form
  test. Conventional-commit style, e.g. `test: add jsdom + RTL infra`, `test(auth): cover route guards`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add devDependencies

Add `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` (+ optional `@testing-library/user-event`)
to `apps/web/package.json` devDependencies at versions compatible with React 19 and Vitest 4. Run
`pnpm install`.

**Verify**: `pnpm install` → exit 0; `grep -c "@testing-library/react" apps/web/package.json` → 1.

### Step 2: Wire the DOM environment without slowing existing Node tests

Edit `apps/web/vitest.config.ts`:
- Add `@vitejs/plugin-react` to a `plugins: [react()]` array (import it).
- Keep `environment: "node"` as the default, and opt specific files into jsdom using
  `test.environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]]` (so only `.tsx` component tests get a DOM;
  pure `.ts` tests stay fast on Node). If `environmentMatchGlobs` is unavailable in this Vitest version,
  instead set `environment: "jsdom"` globally and confirm all existing tests still pass.
- Add `setupFiles: ["./vitest.setup.ts"]`.

Create `apps/web/vitest.setup.ts`:
```ts
import "@testing-library/jest-dom"
```

**Verify**: `pnpm run web:test` → exit 0, all existing tests still pass (count ≥ the post-`plans/002` count).

### Step 3: Auth route-guard tests

Write `protected-route.test.tsx` and `public-only-route.test.tsx`. Mock `useAuth` (and `useAuthStore` where
needed) with `vi.mock("@/features/auth/stores/auth-store", ...)`. Render inside a `react-router` memory
router. Cases:
- ProtectedRoute: `isLoading` → spinner shown, no navigation; `!user` → redirects to `/sign-in` carrying
  `state.from = current path`; `user && !isEnabled` → redirects to `/sign-in`; `user && isEnabled` →
  renders child `<Outlet/>` content.
- PublicOnlyRoute: `user && isEnabled` → redirects to the resolved `from` target; otherwise renders the
  public `<Outlet/>` content.

Model structure on `apps/web/src/shared/access-control.test.ts` for the `describe`/`it` layout.

**Verify**: `pnpm run web:test` → the two new files pass.

### Step 4: OAuth-callback redirect test

Write `oauth-callback.test.tsx`. Use fake timers (`vi.useFakeTimers()`) for the 8s fallback. Cases:
- With a session present, navigates to a safe `?next` path.
- `safeNext` rejects an absolute URL (`https://evil.com`) and `//evil.com` → falls back to `HOME_PATH`.
- No session after 8s → navigates to `/sign-in?oauth_failed=1`.

Mock `useNavigate` to assert the navigation target. Mock `useAuth`/`useAuthStore.getState` for session state.

**Verify**: `pnpm run web:test` → the file passes.

### Step 5: Admin edit-form test (starter)

Write `admin-event-edit-form.test.tsx`. The pure mapping (`event-editor-mappers.ts`) is already covered by
`event-editor-mappers.test.ts`, so focus the *component* test on the wiring: rendering with an event,
editing one field, and asserting the submit handler is called with a patch containing only the changed
field (dirty tracking). Mock any data hooks the form calls. Keep this to 2–3 high-value cases; exhaustive
field coverage is a follow-on.

**Verify**: `pnpm run web:test` → the file passes.

### Step 6: Full gate

**Verify**: `pnpm run verify:web` → exit 0. `pnpm run workspace:test` → exit 0 (the new devDeps are
test-only and must not break the bundle-budget guard, which measures `dist`, not devDeps).

## Test plan

This plan *is* the test plan: 4 new component test files plus the infra to run them. Each new file must run
under jsdom and pass. Use `apps/web/src/shared/access-control.test.ts` (layout) and
`apps/web/src/features/admin/lib/event-editor-mappers.test.ts` (mapper assertions) as structural patterns.

## Done criteria

- [ ] `jsdom` + `@testing-library/react` + `@testing-library/jest-dom` in `apps/web/package.json` devDeps
- [ ] `apps/web/vitest.setup.ts` exists and imports jest-dom; vitest config wires React plugin + DOM env
- [ ] Existing Node-env tests still pass (no regressions, count not reduced)
- [ ] 4 new `.test.tsx` files exist and pass: protected-route, public-only-route, oauth-callback, admin form
- [ ] `pnpm run web:test` exits 0; `pnpm run web:check` exits 0
- [ ] `pnpm run verify:web` exits 0 and `pnpm run workspace:test` exits 0
- [ ] `plans/README.md` status row for 008 updated

## STOP conditions

Stop and report (do not improvise) if:
- `plans/002` has not landed (`include` still excludes `.test.tsx`) — `.test.tsx` files won't run; do that first.
- A version of `@testing-library/react`/`jsdom` compatible with React 19 + Vitest 4 cannot be resolved
  (peer-dep conflict) — report the conflict instead of forcing `--force`/overrides.
- Adding jsdom globally breaks an existing Node-env test that relied on no-DOM globals — switch to the
  per-glob environment approach (Step 2) and report if that's also unavailable.
- A guard test (`workspace:test`) fails due to the new devDeps — report which guard and why.

## Maintenance notes

- Follow-on coverage (not in this plan): sign-in/sign-up pages, reset/forgot-password, submit-event form,
  and broader admin-form field cases — all now possible on this harness.
- Keep component tests in `.test.tsx` (jsdom) and pure-logic tests in `.test.ts` (Node) so the fast Node
  suite stays fast.
- Reviewer: confirm no component under test was modified to make a test pass.
</content>
