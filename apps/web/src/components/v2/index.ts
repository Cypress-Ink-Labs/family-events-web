/**
 * v2 design-system primitives.
 *
 * Mobile-first layout vocabulary that wraps existing Radix/shadcn primitives
 * and consumes tokens from `packages/design-system`. Old `components/ui/*`
 * primitives remain unchanged during the per-route migration; new code should
 * compose from `v2/*` instead.
 *
 * See `docs/DESIGN.md` for the rationale + `docs/design/mocks/design-preview.html`
 * for visual reference.
 */

export { TouchTarget } from "./touch-target.js"
export { Page } from "./page.js"
export { Stack, Row } from "./stack.js"
export { Section } from "./section.js"
export { Toolbar } from "./toolbar.js"
export { ResponsiveCard } from "./responsive-card.js"
export { FormGrid } from "./form-grid.js"
export { FilterBar } from "./filter-bar.js"
export { MobileTable, type MobileTableColumn } from "./mobile-table.js"
export { BottomSheet } from "./bottom-sheet.js"
export { designTokens, v2Breakpoints, type V2Breakpoint } from "./_tokens.js"
