import { useSyncExternalStore } from "react"
import { v2Breakpoints, type V2Breakpoint } from "@/components/v2/_tokens"

const ORDERED: readonly V2Breakpoint[] = ["xs", "sm", "md", "lg", "xl", "2xl"]

function getCurrent(width: number): V2Breakpoint {
  let current: V2Breakpoint = "xs"
  for (const bp of ORDERED) {
    if (width >= v2Breakpoints[bp]) current = bp
  }
  return current
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener("resize", callback, { passive: true })
  return () => window.removeEventListener("resize", callback)
}

function getSnapshot(): number {
  if (typeof window === "undefined") return v2Breakpoints.lg
  return window.innerWidth
}

function getServerSnapshot(): number {
  return v2Breakpoints.lg
}

export type BreakpointResult = {
  /** Current breakpoint bucket (xs → 2xl). */
  current: V2Breakpoint
  /** Raw viewport width in px. */
  width: number
  /** `true` if viewport width ≥ the named breakpoint's threshold. */
  isAtLeast: (bp: V2Breakpoint) => boolean
  /** `true` if viewport width < the named breakpoint's threshold. */
  isBelow: (bp: V2Breakpoint) => boolean
}

/**
 * Viewport-driven breakpoint hook using the v2 design-system token scale.
 *
 * Prefer Tailwind container-query variants (`@container/<name>` + `@md:`)
 * over this hook for component-level responsiveness — a card that re-flows
 * based on its own size, not the viewport, is more reusable. Use this hook
 * for layout-shell decisions (e.g., sheet vs dialog, sidebar vs drawer).
 */
export function useBreakpoint(): BreakpointResult {
  const width = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const current = getCurrent(width)
  return {
    current,
    width,
    isAtLeast: (bp) => width >= v2Breakpoints[bp],
    isBelow: (bp) => width < v2Breakpoints[bp],
  }
}
