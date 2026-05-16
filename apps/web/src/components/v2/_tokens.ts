export { designTokens } from "@family-events/design-system"
export type { DesignTokens } from "@family-events/design-system"

export const v2Breakpoints = {
  xs: 320,
  sm: 480,
  md: 640,
  lg: 900,
  xl: 1200,
  "2xl": 1440,
} as const

export type V2Breakpoint = keyof typeof v2Breakpoints
