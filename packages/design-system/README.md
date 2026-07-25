# @cypress-ink-labs/design-system

Single source of truth for visual tokens. Feeds `apps/web` (CSS vars) and package artifacts for external mobile consumers via codegen.

## Why

Hand-edited tokens drift between web and external mobile consumers. This package owns `tokens/tokens.json` and codegens equivalent outputs for each consumer. CI verifies no drift.

## Layout

```
packages/design-system/
├── tokens/
│   └── tokens.json              source of truth (color, space, type, motion, breakpoint)
├── src/
│   ├── index.ts                 runtime exports (TS consumers)
│   ├── types.ts                 token shape types
│   ├── generated/tokens.ts      generated TS mirror (committed)
│   └── __tests__/               lock-tests for brand-critical values
├── dist/
│   ├── ios/Tokens.swift          Swift artifact for external mobile consumers
│   └── android/Tokens.kt         Kotlin artifact for external mobile consumers
└── scripts/
    ├── build.mjs                runs all codegen
    ├── gen-web-css.mjs          → apps/web/src/styles/tokens.generated.css
    ├── gen-ios-swift.mjs        → dist/ios/Tokens.swift
    ├── gen-android-kotlin.mjs   → dist/android/Tokens.kt
    ├── gen-ts-tokens.mjs        → src/generated/tokens.ts
    └── verify-drift.mjs         CI check — exits 1 if any generated file is stale
```

## Commands

```bash
pnpm --filter @cypress-ink-labs/design-system build         # regen all outputs
pnpm --filter @cypress-ink-labs/design-system verify:drift  # CI: fail on stale generated files
pnpm --filter @cypress-ink-labs/design-system test          # lock-tests on brand values
pnpm --filter @cypress-ink-labs/design-system check         # typecheck
```

## Editing tokens

1. Edit `tokens/tokens.json`.
2. Run `pnpm --filter @cypress-ink-labs/design-system build`.
3. Commit `tokens.json` AND the regenerated outputs together.
4. CI will reject the PR if you forget step 2.

## Consumers

- **Web** — `apps/web/src/index.css` imports `styles/tokens.generated.css`. Tailwind 4's `@theme inline` block references `var(--color-*)` etc.
- **Mobile** — package artifacts `dist/ios/Tokens.swift` and `dist/android/Tokens.kt` are shipped for external mobile consumers.
- **TS** — Import `{ designTokens }` from `@cypress-ink-labs/design-system` for programmatic access.

## Reference

- Design rationale: [`docs/DESIGN.md`](../../docs/DESIGN.md)
