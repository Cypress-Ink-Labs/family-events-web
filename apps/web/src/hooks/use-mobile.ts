import { useBreakpoint } from "@/hooks/use-breakpoint"

/**
 * Backward-compatible alias kept for existing callers (sidebar, app-layout).
 * New code should prefer `useBreakpoint` directly, which exposes the full
 * `xs|sm|md|lg|xl|2xl` token scale and container-query-friendly comparators.
 *
 * `isMobile` here means "below `md` (640px)" — matches the v2 token scale.
 * Old code used a 768 threshold; the slight tighten to 640 lines up with the
 * mobile-tight density spec in `docs/DESIGN.md`.
 */
export function useIsMobile(): boolean {
  return useBreakpoint().isBelow("md")
}
