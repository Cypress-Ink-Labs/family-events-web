import { describe, expect, it } from "vitest"
import { deriveFallbackTips, type ParentTipsEventInput } from "./parent-tips-fallback"

function buildEvent(overrides: Partial<ParentTipsEventInput> = {}): ParentTipsEventInput {
  return {
    age_min: null,
    age_max: null,
    is_outdoor: null,
    start_datetime: "2026-06-15T15:00:00Z", // 10am America/Chicago default
    timezone: "America/Chicago",
    tag_slugs: [],
    ...overrides,
  }
}

describe("deriveFallbackTips", () => {
  it("returns an arrival fallback when nothing matches", () => {
    const tips = deriveFallbackTips(buildEvent())
    expect(tips).toHaveLength(1)
    expect(tips[0].category).toBe("arrival")
  })

  it("suggests bringing snacks for under-three events", () => {
    const tips = deriveFallbackTips(buildEvent({ age_min: 1, age_max: 2 }))
    expect(tips.some((t) => t.category === "bring" && /snack/i.test(t.text))).toBe(true)
  })

  it("recommends weather check for outdoor events", () => {
    const tips = deriveFallbackTips(buildEvent({ is_outdoor: true }))
    expect(tips.some((t) => t.category === "weather")).toBe(true)
  })

  it("recommends arriving early for indoor events", () => {
    const tips = deriveFallbackTips(buildEvent({ is_outdoor: false }))
    expect(tips.some((t) => t.category === "arrival")).toBe(true)
  })

  it("suggests change of clothes for messy-play tags", () => {
    const tips = deriveFallbackTips(buildEvent({ tag_slugs: ["messy-play"] }))
    expect(tips.some((t) => t.category === "bring" && /clothes/i.test(t.text))).toBe(true)
  })

  it("suggests confirmation for ticketed events", () => {
    const tips = deriveFallbackTips(buildEvent({ tag_slugs: ["ticketed"] }))
    expect(tips.some((t) => t.category === "arrival" && /confirm/i.test(t.text))).toBe(true)
  })

  it("warns about nap window for evening events", () => {
    const tips = deriveFallbackTips(
      // 6:30pm in Chicago = 23:30 UTC.
      buildEvent({ start_datetime: "2026-06-15T23:30:00Z" })
    )
    expect(tips.some((t) => t.category === "timing")).toBe(true)
  })

  it("fires timing rule exactly at 17:00 in event's timezone", () => {
    const tips = deriveFallbackTips(
      // 17:00 in Chicago = 22:00 UTC.
      buildEvent({ start_datetime: "2026-06-15T22:00:00Z" })
    )
    expect(tips.some((t) => t.category === "timing")).toBe(true)
  })

  it("does not fire timing rule before 17:00 in event's timezone", () => {
    const tips = deriveFallbackTips(
      // 16:59 in Chicago = 21:59 UTC.
      buildEvent({ start_datetime: "2026-06-15T21:59:00Z" })
    )
    expect(tips.some((t) => t.category === "timing")).toBe(false)
  })

  it("uses event timezone, not viewer's local timezone", () => {
    const tips = deriveFallbackTips(
      // 18:00 in Honolulu = 04:00 UTC next day. Verifies hour is read in
      // event's TZ regardless of where the test runs.
      buildEvent({
        start_datetime: "2026-06-16T04:00:00Z",
        timezone: "Pacific/Honolulu",
      })
    )
    expect(tips.some((t) => t.category === "timing")).toBe(true)
  })

  it("does not bring snacks for age_min === 3 (boundary)", () => {
    const tips = deriveFallbackTips(buildEvent({ age_min: 3, age_max: 5 }))
    expect(tips.some((t) => t.category === "bring" && /snack/i.test(t.text))).toBe(false)
  })

  it("caps at three tips even when many rules fire", () => {
    const tips = deriveFallbackTips(
      buildEvent({
        age_min: 1,
        is_outdoor: true,
        // 7pm Chicago.
        start_datetime: "2026-06-16T00:00:00Z",
        tag_slugs: ["messy-play", "ticketed"],
      })
    )
    expect(tips.length).toBeLessThanOrEqual(3)
  })

  it("dedupes by category", () => {
    const tips = deriveFallbackTips(buildEvent({ tag_slugs: ["messy-play"], age_min: 1 }))
    const categories = tips.map((t) => t.category)
    expect(new Set(categories).size).toBe(categories.length)
  })

  it("returns objects with non-empty category and text", () => {
    const tips = deriveFallbackTips(buildEvent({ age_min: 1, is_outdoor: true }))
    for (const tip of tips) {
      expect(tip.category.length).toBeGreaterThan(0)
      expect(tip.text.length).toBeGreaterThan(0)
    }
  })

  it("treats null is_outdoor as unknown (no weather/arrival opinion)", () => {
    const tips = deriveFallbackTips(buildEvent({ is_outdoor: null }))
    expect(tips.some((t) => t.category === "weather")).toBe(false)
  })
})
