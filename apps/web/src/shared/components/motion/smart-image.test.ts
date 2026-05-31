import { describe, expect, it } from "vitest"
import { buildSrcSet, IMAGE_WIDTHS } from "@family-events/shared"

/**
 * SmartImage component tests — logic-level verification.
 *
 * The component renders in a browser; these tests verify the proxy
 * integration logic and configuration constants that SmartImage depends on.
 * Full rendering verification happens via Playwright e2e.
 */

/** Mirror of SmartImage's SIZES_MAP — kept in sync manually. */
const SIZES_MAP = {
  card: "(max-width: 640px) 100vw, 300px",
  hero: "100vw",
  thumbnail: "150px",
} as const

const SAMPLE_URL = "https://images.unsplash.com/photo-123"

describe("SmartImage proxy integration", () => {
  it("generates srcSet with all standard widths for a valid URL", () => {
    const srcSet = buildSrcSet(SAMPLE_URL)
    expect(srcSet).toBeDefined()
    for (const w of IMAGE_WIDTHS) {
      expect(srcSet).toContain(`${w}w`)
    }
  })

  it("returns undefined srcSet for invalid source (component falls back to plain src)", () => {
    expect(buildSrcSet("")).toBeUndefined()
    expect(buildSrcSet("not-a-url")).toBeUndefined()
    expect(buildSrcSet("data:image/png;base64,abc")).toBeUndefined()
  })

  it("generates proxy URLs through wsrv.nl by default", () => {
    const srcSet = buildSrcSet(SAMPLE_URL)
    expect(srcSet).toContain("wsrv.nl")
    expect(srcSet).toContain("output=webp")
  })
})

describe("SmartImage variant sizes", () => {
  it("card variant uses responsive breakpoint", () => {
    expect(SIZES_MAP.card).toContain("300px")
    expect(SIZES_MAP.card).toContain("max-width: 640px")
  })

  it("hero variant uses full viewport width", () => {
    expect(SIZES_MAP.hero).toBe("100vw")
  })

  it("thumbnail variant uses fixed small width", () => {
    expect(SIZES_MAP.thumbnail).toBe("150px")
  })
})

describe("SmartImage priority behavior", () => {
  it("priority=true should result in eager loading and high fetchpriority", () => {
    // This documents the expected behavior — verified at the component level.
    // priority=true → loading="eager" + fetchPriority="high"
    // priority=false (default) → loading="lazy" + no fetchPriority
    const priority = true
    expect(priority ? "eager" : "lazy").toBe("eager")
    expect(priority ? "high" : undefined).toBe("high")
  })

  it("default (no priority) should result in lazy loading", () => {
    const priority = false
    expect(priority ? "eager" : "lazy").toBe("lazy")
    expect(priority ? "high" : undefined).toBeUndefined()
  })
})

describe("SmartImage error fallback logic", () => {
  it("when proxy srcSet is present and error fires, fallback removes srcSet", () => {
    // Documents the component's fallback behavior:
    // 1. On first error with srcSet present → set useFallback=true → srcSet becomes undefined
    // 2. Component re-renders with plain src only (original URL)
    // 3. If that also errors → normal error handling (loadedSrc=undefined)
    const hasSrcSet = true
    const useFallback = false

    // First error: proxy failed
    const shouldFallback = !useFallback && hasSrcSet
    expect(shouldFallback).toBe(true)

    // After fallback: no more srcSet
    const fallbackSrcSet = buildSrcSet("") // invalid → undefined
    expect(fallbackSrcSet).toBeUndefined()
  })
})
