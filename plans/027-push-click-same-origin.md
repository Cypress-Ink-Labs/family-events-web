# Plan 027: Constrain push-notification click navigation to same-origin URLs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 48f32f9..HEAD -- apps/web/public/sw-push.js apps/web/src/infrastructure/safe-url.ts apps/web/src/infrastructure/safe-url.test.ts`
> Re-read every cited file and compare the "Current state" excerpts against the
> live code before proceeding. Any mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `48f32f9`, 2026-07-24
- **Issue**: none (not published)

## Why this matters

The authenticated push producer currently controls the path used when a user
clicks a notification. A malformed or compromised producer can therefore direct
a click to an unrelated origin. This is defense in depth rather than a direct
user-input vulnerability: push delivery is authenticated, but a notification
click is still a navigation trust boundary. Restricting the destination to the
service worker's origin preserves valid application routes while rejecting
external, protocol-relative, and script-scheme URLs.

## Current state

`apps/web/public/sw-push.js:4-24` parses the push payload, destructures its
unvalidated `url`, and writes it directly into notification data at line 21:

```js
const { title = "Family Events", body = "", url, icon } = payload

event.waitUntil(
  self.registration.showNotification(title, {
    body,
    icon: icon || "/brand/icon-192.png",
    badge: "/brand/icon-192.png",
    data: { url: url || "/" },
    tag: payload.tag || undefined,
  })
)
```

The click handler at `apps/web/public/sw-push.js:27-45` reads that value at line
30 and sends it directly to `WindowClient.navigate(url)` at line 37 or
`clients.openWindow(url)` at line 42:

```js
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if one is open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url)
    })
  )
})
```

`apps/web/src/infrastructure/safe-url.ts:1-40` is the existing, tested home for
URL safety helpers. It currently exports only `safeHref` and `safeImageSrc`,
both built on `parseScheme`; it has no same-origin app-route resolver.

`apps/web/src/infrastructure/safe-url.test.ts:1-62` is a node-environment Vitest
suite. It imports the helpers directly and groups table-like expectations by
helper (`safeHref` at lines 4-40 and `safeImageSrc` at lines 42-62), which is the
pattern the new resolver tests must follow.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Full gate | `pnpm run verify:web` | exit 0 |
| Web check | `pnpm run web:check` | exit 0, no type or lint errors |
| Web tests | `pnpm run web:test` | all tests pass, including `resolveAppUrl` cases |
| Web build | `pnpm run web:build` | exit 0 |
| Guard tests | `pnpm run workspace:test` | exit 0 |
| Docs guard | `pnpm run docs:test` | exit 0 |
| Dead code | `pnpm knip` | no new dead-code findings |
| Dependency audit | `pnpm audit` | no new vulnerabilities |

Vitest unit tests are colocated: `*.test.ts` uses the node environment and
`*.test.tsx` declares `// @vitest-environment jsdom`. React Testing Library is
available when a DOM test is needed.

## Scope

**In scope**:

- `apps/web/public/sw-push.js`
- `apps/web/src/infrastructure/safe-url.ts`
- `apps/web/src/infrastructure/safe-url.test.ts`

**Out of scope**:

- The push backend producer and its payload schema.
- VAPID configuration and push delivery.
- Bundling or importing application source into `public/sw-push.js`; service
  workers under `public/` are served statically and cannot import bundled
  modules.

## Git workflow

- Branch: `advisor/027-push-click-same-origin`
- Conventional Commits, e.g. `fix(web): constrain push click URLs to the app origin`.
- Do NOT push or open a PR.

## Steps

### Step 1: Reconfirm the static-worker boundary and navigation sinks

Run the preamble drift check, then re-read the exact worker data-write and click
handler excerpts above. Confirm that the worker remains a public static asset:
it must not import the TypeScript helper. Re-read `safe-url.ts` and its tests to
follow their existing direct-export/node-test pattern.

**Verify**: `pnpm run web:test` → the unmodified suite passes before the change.

### Step 2: Add the canonical same-origin resolver and its tests

Add this exact exported signature and semantics to
`apps/web/src/infrastructure/safe-url.ts`:

```ts
export function resolveAppUrl(raw: unknown, origin: string): string {
  try {
    const u = new URL(typeof raw === "string" && raw ? raw : "/", origin)
    return u.origin === origin ? u.pathname + u.search + u.hash : "/"
  } catch {
    return "/"
  }
}
```

Extend `safe-url.test.ts` in its existing `describe` style. Assert: relative
`/events/1`; a same-origin absolute URL; unrelated-origin
`https://evil.example/x` to `/`; protocol-relative `//evil.example` to `/`;
`javascript:` to `/`; and empty, `null`, and non-string inputs to `/`.

**Verify**: `pnpm run web:test` → all resolver cases pass with the existing safe-URL tests.

### Step 3: Mirror the resolver in the public service worker at both sinks

Because `public/sw-push.js` cannot import the bundled TypeScript module, inline
the identical resolver logic in that file, immediately preceded by this exact
comment:

```js
// Mirror of resolveAppUrl in src/infrastructure/safe-url.ts — service workers cannot import bundled modules; keep in sync.
```

Use the mirror when `showNotification` constructs `data: { url }` in the `push`
handler (currently line 21), passing the payload URL and `self.location.origin`.
Then make the final guard in `notificationclick`: normalize
`event.notification.data?.url` with the same mirror and `self.location.origin`
before the value reaches either `client.navigate(url)` or
`self.clients.openWindow(url)` (currently lines 37 and 42). Apply both guards;
the click-time guard protects existing notifications created before deployment.

**Verify**: `pnpm run web:check` → the TypeScript helper and worker changes introduce no check failures.

### Step 4: Run the complete web gate and deploy check

Run the complete web verification. After deployment, hard-refresh the service
worker: the development server registers `sw-push.js`, so existing registrations
may retain the previous static worker until refreshed.

**Verify**: `pnpm run verify:web` → exit 0.

## Test plan

- Extend the existing node-environment `safe-url.test.ts`; no service-worker
  harness is needed for this narrow mirror.
- Test a relative route and same-origin absolute URL preserve path, query, and
  hash through `resolveAppUrl`.
- Test unrelated, protocol-relative, `javascript:`, empty, null, and non-string
  values resolve to `/`.
- Verify with `pnpm run web:test`, `pnpm run web:check`, and the full web gate.
- Manually hard-refresh the service worker after deployment, then click a
  notification that targets an in-app route and confirm it stays in-app.

## Done criteria

- [ ] `resolveAppUrl(raw: unknown, origin: string): string` exists with the
  exact URL-construction, same-origin, and fallback semantics in Step 2.
- [ ] Its test suite covers the relative, same-origin absolute, external,
  protocol-relative, `javascript:`, empty, null, and non-string cases.
- [ ] `sw-push.js` contains the exact mirror comment and identical resolver
  logic.
- [ ] The worker resolves the payload URL when writing notification `data.url`.
- [ ] The click handler resolves notification `data.url` again before both
  `client.navigate` and `self.clients.openWindow` paths.
- [ ] `pnpm run web:test` exits 0.
- [ ] `pnpm run web:check` exits 0.
- [ ] `pnpm run verify:web` exits 0.

## STOP conditions

- Any cited file does not match the "Current state" excerpts after the drift
  check.
- `sw-push.js` is no longer a public static service-worker asset or gains a
  supported bundled import path; do not retain a duplicated helper without
  reconciling the new deployment boundary.
- The source no longer has both notification-data and click-navigation apply
  points described above.
- The tested helper cannot preserve a same-origin relative route while rejecting
  another origin; stop rather than weakening the same-origin contract.
- The verification gate fails twice after a reasonable in-scope correction.

## Maintenance notes

- The helper is intentionally duplicated only because the public service worker
  cannot import bundled source. Keep the exact mirror comment and update both
  implementations atomically if the semantics change.
- The final click-time guard is deliberate: it protects notifications that were
  generated by an older worker before the data-write guard was deployed.
- Push delivery is authenticated. This is a defense-in-depth navigation boundary,
  not a replacement for producer validation.
- After deployment, hard-refresh the service worker before manually testing a
  notification click.
