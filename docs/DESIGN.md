# Design System

## Two Primitive Systems

The web app has two distinct primitive layers that are **complementary, not competing**. They serve different
concerns and are both intended to be used in new code.

---

### `shared/components/ui/*` — Interactive Component Primitives

`apps/web/src/shared/components/ui/*` contains CVA + Radix wrappers generated from shadcn/ui. These are the
**interactive component vocabulary**: buttons, inputs, dialogs, selects, tooltips, dropdowns, and other
focusable/stateful elements. They own interaction semantics, accessible markup, keyboard behavior, and variant
styling.

**Use `ui/*` when you need:**
- Buttons, inputs, textareas, checkboxes, switches
- Dialogs, sheets, alert-dialogs, dropdowns
- Tabs, carousels, progress indicators
- Tooltips, badges, avatars, skeletons
- Anything that Radix manages (focus trap, portal, ARIA roles)

These components are stable and widely used (~314 usages). They are **not being replaced** — v2 does not
duplicate them.

---

### `components/v2/*` — Layout and Page Vocabulary

`apps/web/src/components/v2/*` is the newer **mobile-first layout vocabulary**. It wraps Tailwind utility
classes into named layout components that enforce consistent page structure, spacing, and breakpoint behavior
across routes.

**Use `v2/*` when you need:**
- Page-level containers with consistent max-width + padding (`Page`)
- Vertical flex stacks with spacing tokens (`Stack`)
- Page/section headers with title, subtitle, and action slots (`Toolbar`)
- Responsive form grids that go single-column on mobile (`FormGrid`)
- Horizontal scroll-snap filter chip rows (`FilterBar`)

**Current exports** (from `apps/web/src/components/v2/index.ts`):

| Export | Replaces | Notes |
|--------|----------|-------|
| `Page` | Ad-hoc `max-w-5xl mx-auto px-4` wrapper divs | Supports `content` (1280 px), `wide` (1440 px), `full` widths |
| `Stack` | Ad-hoc `flex flex-col gap-*` divs | Spacing token: gap-1=4px, gap-4=16px (default), gap-5=24px |
| `Toolbar` | Ad-hoc page header rows with wrapping actions | Title, subtitle, actions, and a children filter slot |
| `FormGrid` | Ad-hoc `grid grid-cols-2` that overflows phone width | Single-column on mobile, steps up at `md+` |
| `FilterBar` | Ad-hoc `flex overflow-x-auto` chip rows | Scroll-snap on mobile, wraps on `md+` |

The `_tokens.ts` module exports `v2Breakpoints` — the canonical breakpoint constants consumed by v2 components.
It should not be imported directly by app code; use Tailwind breakpoint classes instead.

---

## When to Use Which

| Scenario | Use |
|----------|-----|
| Wrapping route content with consistent max-width / padding | `v2/Page` |
| Building a vertical list or section | `v2/Stack` |
| Adding a page header with title + action buttons | `v2/Toolbar` |
| Laying out a form on mobile and desktop | `v2/FormGrid` |
| Scrollable filter chip row | `v2/FilterBar` |
| A clickable button | `ui/Button` |
| A text input, select, or checkbox | `ui/Input`, `ui/Select`, `ui/Checkbox` |
| A modal, drawer, or confirmation prompt | `ui/Dialog`, `ui/Sheet`, `ui/AlertDialog` |
| Tabs, dropdowns, tooltips, badges | `ui/*` equivalents |

In practice a route uses **both**: `v2/Page` + `v2/Toolbar` for structure, then `ui/Button` and `ui/Select`
for interactive elements inside that structure.

---

## Migration Stance

Migration is **per-route and incremental**. `shared/components/ui/*` is not being removed. The goal is to
adopt `v2/*` layout components on new routes and when touching existing routes, replacing ad-hoc Tailwind
utility patterns with the named layout components.

There is no deadline to migrate all existing routes. Do not do a big-bang migration.

**Guidance for new code:**
- New routes and new page sections: compose structure from `v2/*`.
- Interactive elements inside those structures: continue using `ui/*`.
- Do not reach into `v2/_tokens.ts` from app code; use Tailwind breakpoint classes.

---

## Design Tokens

Tokens originate in `packages/design-system/tokens/tokens.json` (colors, spacing, typography, motion,
breakpoints). The build step in `packages/design-system` codegenerates:

- `apps/web/src/styles/tokens.generated.css` — CSS custom properties consumed by Tailwind 4 via `@theme inline`
- `packages/design-system/src/generated/tokens.ts` — TypeScript mirror for programmatic access
- `packages/design-system/dist/ios/Tokens.swift` and `packages/design-system/dist/android/Tokens.kt` — package artifacts shipped for external mobile consumers

The v2 layout components consume these tokens via Tailwind utility classes that reference the generated CSS
variables. Do not hardcode color or spacing values in v2 components — use the token-backed Tailwind classes.

To regenerate token artifacts:

```bash
pnpm --filter @cypress-ink-labs/design-system build
```

See `packages/design-system/README.md` for the full token editing workflow and drift-check commands.
