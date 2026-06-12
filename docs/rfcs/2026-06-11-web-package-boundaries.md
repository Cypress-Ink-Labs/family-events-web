# Web Package Boundaries

## TypeScript Packages

The web repository contains local TypeScript packages for shared helpers, TypeScript configuration, quality configuration, and design tokens. Shared helpers must remain framework neutral.

## Web

`apps/web` owns browser runtime code, React UI, routing, Supabase browser clients, and feature workflows. Runtime Supabase imports stay behind `apps/web/src/infrastructure/supabase/client.ts`.

## External Contracts Package

Database and API contract types come from the published `@cypress-ink-labs/contracts` package. This keeps the web repository small while preserving a typed boundary with backend-owned contracts.

## Design Tokens

`packages/design-system` owns source tokens and generated artifacts. Web consumes `apps/web/src/styles/tokens.generated.css`; mobile consumers use the package dist artifacts instead of app-tree copies.

## Guard Coverage

`tests/guards/domain-boundaries.test.mjs` enforces the package boundaries described here.
