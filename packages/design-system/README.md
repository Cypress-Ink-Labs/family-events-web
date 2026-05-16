# @family-events/design-system

Single source of truth for visual tokens. Feeds both `apps/web` (CSS vars) and `apps/ios` (Swift constants) via codegen.

## Why

Hand-edited tokens drift between web and iOS. This package owns `tokens/tokens.json` and codegens equivalent outputs for each consumer. CI verifies no drift.

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
└── scripts/
    ├── build.mjs                runs all codegen
    ├── gen-web-css.mjs          → apps/web/src/styles/tokens.generated.css
    ├── gen-ios-swift.mjs        → apps/ios/Packages/FEDesignSystem/Sources/FEDesignSystem/Generated/Tokens.swift
    ├── gen-ts-tokens.mjs        → src/generated/tokens.ts
    └── verify-drift.mjs         CI check — exits 1 if any generated file is stale
```

## Commands

```bash
pnpm --filter @family-events/design-system build         # regen all outputs
pnpm --filter @family-events/design-system verify:drift  # CI: fail on stale generated files
pnpm --filter @family-events/design-system test          # lock-tests on brand values
pnpm --filter @family-events/design-system check         # typecheck
```

## Editing tokens

1. Edit `tokens/tokens.json`.
2. Run `pnpm --filter @family-events/design-system build`.
3. Commit `tokens.json` AND the regenerated outputs together.
4. CI will reject the PR if you forget step 2.

## Consumers

- **Web** — `apps/web/src/index.css` imports `styles/tokens.generated.css`. Tailwind 4's `@theme inline` block references `var(--color-*)` etc.
- **iOS** — `FEDesignSystem` includes `Generated/Tokens.swift`. Use `DesignTokens.Color.Light.accentPrimary`, `DesignTokens.Space.s4`, `DesignTokens.TextScale.heroMobile`.
- **TS** — Import `{ designTokens }` from `@family-events/design-system` for programmatic access.

## Reference

- Design rationale: [`docs/DESIGN.md`](../../docs/DESIGN.md)
- Visual mock: [`docs/design/mocks/design-preview.html`](../../docs/design/mocks/design-preview.html)
