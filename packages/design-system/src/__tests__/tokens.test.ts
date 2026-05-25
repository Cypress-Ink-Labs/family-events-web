import { describe, expect, it } from "vitest"
import { designTokens } from "../index.js"

describe("designTokens", () => {
  it("locks brand-critical color hex values", () => {
    // Dusk-Meadow palette (2026-05-24 redesign)
    expect(designTokens.color.light["accent-primary"].hex).toBe("#4A8070")
    expect(designTokens.color.light["accent-secondary"].hex).toBe("#E89060")
    expect(designTokens.color.light["accent-tertiary"].hex).toBe("#5A7EA8")
    expect(designTokens.color.light["accent-kid"].hex).toBe("#CCAA35")
  })

  it("keeps body type at 16px on mobile (iOS HIG floor)", () => {
    expect(designTokens.typography.scale.base.mobile.px).toBe(16)
  })

  it("declares the 44pt touch-target floor", () => {
    expect(designTokens.touch.min.px).toBe(44)
  })

  it("uses dark (not pure black) for dark-mode bg", () => {
    const dark = designTokens.color.dark.bg
    expect(dark.hex).not.toMatch(/^#0+$/)
    expect(dark.oklch).toMatch(/^1\d/)
  })

  it("includes all four type families", () => {
    expect(Object.keys(designTokens.typography.family)).toEqual([
      "display",
      "body",
      "editorial",
      "mono",
    ])
  })

  it("uses Fraunces for display", () => {
    expect(designTokens.typography.family.display.stack).toMatch(/Fraunces/)
  })

  it("never references banned fonts in family stacks", () => {
    const banned = ["Inter", "Roboto", "Space Grotesk", "Poppins", "Montserrat"]
    for (const family of Object.values(designTokens.typography.family)) {
      for (const b of banned) {
        expect(family.stack).not.toMatch(new RegExp(`\\b${b}\\b`))
      }
    }
  })
})
