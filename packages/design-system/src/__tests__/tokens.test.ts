import { describe, expect, it } from "vitest"
import { designTokens } from "../index.js"

describe("designTokens", () => {
  it("locks brand-critical color hex values", () => {
    expect(designTokens.color.light["accent-primary"].hex).toBe("#256F5D")
    expect(designTokens.color.light["accent-secondary"].hex).toBe("#E36B3F")
    expect(designTokens.color.light["accent-tertiary"].hex).toBe("#3B75AF")
    expect(designTokens.color.light["accent-kid"].hex).toBe("#F2C94C")
  })

  it("keeps body type at 16px on mobile (iOS HIG floor)", () => {
    expect(designTokens.typography.scale.base.mobile.px).toBe(16)
  })

  it("declares the 44pt touch-target floor", () => {
    expect(designTokens.touch.min.px).toBe(44)
  })

  it("uses warm-dark, not pure black, for dark-mode bg", () => {
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
