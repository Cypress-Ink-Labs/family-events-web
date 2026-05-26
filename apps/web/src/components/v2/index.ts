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

export { Page } from "./page.js"
export { Stack } from "./stack.js"
export { Toolbar } from "./toolbar.js"
export { FormGrid } from "./form-grid.js"
export { FilterBar } from "./filter-bar.js"
