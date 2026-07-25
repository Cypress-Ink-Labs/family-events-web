# apps/web

Scope: React/Vite web app for consumer and admin Family Events workflows.

## Commands

Run from repo root:

```bash
pnpm --filter @cypress-ink-labs/web dev
pnpm --filter @cypress-ink-labs/web check
pnpm --filter @cypress-ink-labs/web test
pnpm --filter @cypress-ink-labs/web build
pnpm --filter @cypress-ink-labs/web test:e2e
```

## Boundaries

- Keep route/page workflows under `apps/web/src/features/*`.
- Keep browser/runtime adapters under `apps/web/src/infrastructure/*` or `apps/web/src/lib/*`.
- Do not construct Supabase runtime clients outside `apps/web/src/infrastructure/supabase/client.ts`.
- Use `@cypress-ink-labs/contracts` for backend/API contract types.
- Use `@cypress-ink-labs/shared` only for framework-neutral helpers.
- Use `@cypress-ink-labs/design-system` or generated tokens for design values.
- Do not import from `apps/ios`, `apps/android`, cron apps, or Supabase function source.

## UI

Read `docs/DESIGN.md` before visual changes.

Generated files are not hand-edited:

- `apps/web/src/styles/tokens.generated.css`
- `packages/design-system/src/generated/*`

Change `packages/design-system/tokens/tokens.json`, then run:

```bash
pnpm --filter @cypress-ink-labs/design-system build
```

## Verification

For web-only changes:

```bash
pnpm run verify:web
```
