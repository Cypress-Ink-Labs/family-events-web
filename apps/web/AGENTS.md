# apps/web

Scope: React/Vite web app for consumer and admin Family Events workflows.

## Commands

Run from repo root:

```bash
pnpm --filter @family-events/web dev
pnpm --filter @family-events/web check
pnpm --filter @family-events/web test
pnpm --filter @family-events/web build
pnpm --filter @family-events/web test:e2e
```

## Boundaries

- Keep route/page workflows under `apps/web/src/features/*`.
- Keep browser/runtime adapters under `apps/web/src/infrastructure/*` or `apps/web/src/lib/*`.
- Do not construct Supabase runtime clients outside `apps/web/src/infrastructure/supabase/client.ts`.
- Use `@family-events/contracts` for backend/API contract types.
- Use `@family-events/shared` only for framework-neutral helpers.
- Use `@family-events/design-system` or generated tokens for design values.
- Do not import from `apps/ios`, `apps/android`, cron apps, or Supabase function source.

## UI

Read `docs/DESIGN.md` before visual changes.

Generated files are not hand-edited:

- `apps/web/src/styles/tokens.generated.css`
- `packages/design-system/src/generated/*`

Change `packages/design-system/tokens/tokens.json`, then run:

```bash
pnpm --filter @family-events/design-system build
```

## Verification

For web-only changes:

```bash
pnpm run verify:web
```

For changes touching shared packages or generated design tokens, also run the relevant mobile checks when generated outputs affect mobile:

```bash
pnpm run verify:ios
pnpm run verify:android
```
