export type ColorToken = {
  oklch: string
  hex: string
  role: string
}

export type ColorMode = Record<string, ColorToken>

export type SpaceScale = Record<string, { px: number }>

export type RadiusScale = Record<
  "sm" | "md" | "lg" | "full",
  { px: number; role: string }
>

export type TypographyFamily = Record<
  "display" | "body" | "editorial" | "mono",
  {
    stack: string
    googleFontsUrl: string
    role: string
  }
>

export type TypographyScaleEntry = {
  mobile: { px: number; lh: number }
  desktop: { px: number; lh: number }
  role: string
}

export type TypographyScale = Record<string, TypographyScaleEntry>

export type TypographyWeight = Record<"regular" | "medium" | "semibold", number>

export type MotionDuration = Record<"micro" | "short" | "medium" | "long", string>

export type MotionEasing = Record<"out" | "in-out" | "spring-soft", string>

export type BreakpointScale = Record<string, { px: number; role: string }>

export type ShadowScale = Record<"sm" | "md" | "lg" | "hero", { value: string }>

export type ZScale = Record<string, number>

export type ContainerQueryScale = Record<string, { px: number }>

export type TouchScale = {
  min: { px: number; role: string }
}

export type DesignTokens = {
  $schema?: string
  meta: {
    name: string
    version: string
    designRef: string
    lockedAt: string
  }
  color: {
    light: ColorMode
    dark: ColorMode
  }
  space: SpaceScale
  radius: RadiusScale
  typography: {
    family: TypographyFamily
    scale: TypographyScale
    weight: TypographyWeight
  }
  motion: {
    duration: MotionDuration
    easing: MotionEasing
  }
  breakpoint: BreakpointScale
  shadow: ShadowScale
  z: ZScale
  touch: TouchScale
  containerQueries: ContainerQueryScale
}
