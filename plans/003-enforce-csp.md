# Plan 003: Enforce Content-Security-Policy (it is currently Report-Only and dormant)

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 4e739e4..HEAD -- apps/web/public/serve.json`
> If it changed since this plan was written, compare against the excerpt below before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4e739e4`, 2026-06-17

## Why this matters

The app ships a thoughtfully-scoped Content-Security-Policy — but as `Content-Security-Policy-Report-Only`.
Report-Only mode **enforces nothing**: it only emits violation reports, and there is no `report-uri`/
`report-to` directive, so the reports go nowhere either. The policy is effectively dormant decoration.
A real XSS or injection in production would not be blocked despite the headers looking protective. The
fix is to promote the policy to the enforcing header `Content-Security-Policy` after a short verification
that the policy doesn't break legitimate app behavior. This is a static SPA served by `serve` on Railway,
so the header lives in `serve.json`.

## Current state

`apps/web/public/serve.json` (verified at `4e739e4`) — the relevant header object inside the `"**"` source:

```json
{
  "key": "Content-Security-Policy-Report-Only",
  "value": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://tiles.openfreemap.org"
}
```

Facts verified:
- `apps/web/package.json` `start` script: `serve -s dist -l ${PORT:-3000}`. `serve` reads `serve.json`
  from the served directory; `serve.json` lives in `apps/web/public/` and is copied into `dist/` by Vite.
- `style-src` includes `'unsafe-inline'`. This is currently **required**: Tailwind v4 + libraries inject
  inline `<style>`/`style=` at runtime. Do NOT remove `'unsafe-inline'` from `style-src` in this plan —
  doing so would break styling. (A nonce-based tightening is a deferred follow-up.)
- `script-src 'self'` has no `'unsafe-inline'` — good, and the app uses no inline scripts except the
  JSON-LD `<script type="application/ld+json">` (which is data, not executable, and is CSP-exempt).
- `connect-src` already allows Supabase (https + wss), Sentry, and the map tile host.
- There is currently no `report-uri`/`report-to`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck/lint/format | `pnpm run web:check` | exit 0 |
| Build | `pnpm run web:build` | exit 0 |
| Preview built app | `pnpm --filter @cypress-ink-labs/web exec serve -s dist -l 4173` | serves; visit `http://localhost:4173` |
| Full gate | `pnpm run verify:web` | exit 0 |

## Scope

**In scope** (modify only):
- `apps/web/public/serve.json`

**Out of scope** (do NOT touch):
- `vite.config.ts`, `railway.toml`, `railpack.json` — header lives in `serve.json` only.
- Do NOT remove `'unsafe-inline'` from `style-src` (breaks Tailwind/runtime styles).
- Do NOT add a nonce pipeline (deferred follow-up; out of scope here).
- Source code — no app code changes are needed.

## Git workflow

- Branch: `advisor/003-enforce-csp`
- Conventional-commit style, e.g. `security: enforce CSP instead of report-only`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Build and smoke-test the current policy in enforce mode locally first

Temporarily verify the policy doesn't break the app *before* committing the header flip. Build, then
serve `dist`, open the app, and exercise the main surfaces (home/explore, an event detail page, the
map route, sign-in page). Open the browser devtools Console and watch for `Content Security Policy`
violation errors.

**Verify**: `pnpm run web:build` → exit 0, then serve `dist` and confirm the app renders. Note any CSP
violations logged. If maps (`https://tiles.openfreemap.org`), Supabase, Sentry, fonts, and images all
load without console CSP errors under the existing report-only policy, the directives are correct.

### Step 2: Promote the header to enforcing

In `apps/web/public/serve.json`, change the header `key` from `Content-Security-Policy-Report-Only` to
`Content-Security-Policy`. Keep the `value` string exactly as-is (do not alter directives in this plan).

**Verify**: `grep -c 'Content-Security-Policy-Report-Only' apps/web/public/serve.json` → `0`, and
`grep -c '"Content-Security-Policy"' apps/web/public/serve.json` → `1`.

### Step 3: Rebuild, serve, and confirm the enforced policy blocks nothing legitimate

Rebuild and serve `dist` again. Re-exercise the same surfaces from Step 1 with devtools open. With the
enforcing header, any wrongly-scoped directive will now **block** a resource (broken map tiles, missing
fonts, failed Supabase calls) rather than merely warn.

**Verify**: app fully functional — maps render, events load, sign-in works, fonts/images load, no CSP
**violation** errors in console. If a legitimate resource is blocked, see STOP conditions.

## Test plan

This is a configuration change with no unit-testable surface (it's an HTTP response header applied by
`serve`). Verification is manual smoke testing of the built app under the enforcing header, per Steps 1
and 3. Document in the PR description which routes you exercised.

## Done criteria

- [ ] `apps/web/public/serve.json` uses `Content-Security-Policy` (not `-Report-Only`)
- [ ] The CSP `value` string is byte-for-byte unchanged from the excerpt
- [ ] `pnpm run web:build` exits 0
- [ ] Manual smoke test of home, event detail, map, and sign-in shows no CSP violations and full function
- [ ] `pnpm run verify:web` exits 0
- [ ] Only `apps/web/public/serve.json` modified (`git status`)
- [ ] `plans/README.md` status row for 003 updated

## STOP conditions

Stop and report (do not improvise) if:
- Under the enforcing header, a legitimate resource is **blocked** (e.g. a host the app needs is missing
  from `connect-src`/`img-src`/`font-src`). Report the exact violation and the host; do NOT loosen the
  policy to `'unsafe-*'` or add wildcards to make it pass — the correct host should be added narrowly,
  and that decision should be confirmed first.
- Removing report-only appears to require a nonce for inline styles/scripts (it should not, given
  `style-src` keeps `'unsafe-inline'`). If it does, stop — nonce work is out of scope.
- The live `serve.json` no longer matches the excerpt (drift).

## Maintenance notes

- **Deferred follow-up**: tighten `style-src` by replacing `'unsafe-inline'` with a build-time nonce.
  That requires HTML transform plumbing and was intentionally excluded here.
- When a new third-party host is integrated (analytics, a new map/tile/image CDN), its origin must be
  added to the appropriate `*-src` directive or the resource will be blocked in production.
- A reviewer should confirm the directive string was not weakened during the flip.
</content>
