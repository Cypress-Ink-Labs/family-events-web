import tokensJson from "../tokens/tokens.json"
import type { DesignTokens } from "./types.js"

export const designTokens = tokensJson as unknown as DesignTokens
export const rawTokens = tokensJson

export type {
  DesignTokens,
  ColorToken,
  ColorMode,
  SpaceScale,
  RadiusScale,
  TypographyFamily,
  TypographyScale,
  MotionDuration,
  MotionEasing,
  BreakpointScale,
  ShadowScale,
  ZScale,
  ContainerQueryScale,
} from "./types.js"
