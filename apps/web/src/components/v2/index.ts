/**
 * v2 design-system primitives.
 *
 * Mobile-first layout vocabulary that wraps existing Radix/shadcn primitives
 * and consumes tokens from `packages/design-system`. Old `components/ui/*`
 * primitives remain unchanged during the per-route migration; new code should
 * compose from `v2/*` instead.
 *
 * See `docs/DESIGN.md` for the rationale and guidance on when to use v2 vs ui primitives.
 */

export { Page } from "./page.js"
export { Stack } from "./stack.js"
export { Toolbar } from "./toolbar.js"
export { FormGrid } from "./form-grid.js"
export { FilterBar } from "./filter-bar.js"
