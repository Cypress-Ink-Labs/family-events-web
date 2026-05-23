import { describe, expect, it } from "vitest"
import { qk } from "@/infrastructure/queries/query-keys"
import { matchesAgeFilter, normalizeKeyword } from "./use-events"
import type { Event } from "@/lib/types"

// Minimal Event stub — matchesAgeFilter only reads age_min / age_max.
// Cast through unknown to avoid listing every required field of Event.
function event(ageMin: number | null, ageMax: number | null): Event {
  return { age_min: ageMin, age_max: ageMax } as unknown as Event
}

describe("matchesAgeFilter", () => {
  it("matches everything when both filter bounds are undefined", () => {
    expect(matchesAgeFilter(event(0, 5), undefined, undefined)).toBe(true)
    expect(matchesAgeFilter(event(10, 12), undefined, undefined)).toBe(true)
    expect(matchesAgeFilter(event(null, null), undefined, undefined)).toBe(true)
  })

  it("treats null age_min as 0 and null age_max as 99 (open-ended)", () => {
    // Open-ended event should overlap every non-empty filter range
    expect(matchesAgeFilter(event(null, null), 3, 5)).toBe(true)
    expect(matchesAgeFilter(event(null, null), 50, 80)).toBe(true)
  })

  it("matches when event range overlaps filter range", () => {
    // Event: 2..6, filter 4..10 — overlap at 4..6
    expect(matchesAgeFilter(event(2, 6), 4, 10)).toBe(true)
  })

  it("matches when filter range is entirely inside event range", () => {
    // Event: 0..12, filter 5..7
    expect(matchesAgeFilter(event(0, 12), 5, 7)).toBe(true)
  })

  it("does not match when event range is entirely above filter range", () => {
    // Event 10..15, filter 0..5
    expect(matchesAgeFilter(event(10, 15), 0, 5)).toBe(false)
  })

  it("does not match when event range is entirely below filter range", () => {
    // Event 0..2, filter 10..15
    expect(matchesAgeFilter(event(0, 2), 10, 15)).toBe(false)
  })

  it("matches when only filter min is given (upper-open filter)", () => {
    // Filter 5..(99). Event max must be >= 5
    expect(matchesAgeFilter(event(0, 10), 5, undefined)).toBe(true)
    expect(matchesAgeFilter(event(0, 3), 5, undefined)).toBe(false)
  })

  it("matches when only filter max is given (lower-open filter)", () => {
    // Filter (0)..5. Event min must be <= 5
    expect(matchesAgeFilter(event(3, null), undefined, 5)).toBe(true)
    expect(matchesAgeFilter(event(10, null), undefined, 5)).toBe(false)
  })

  it("includes exact boundary matches", () => {
    // Event 5..5 with filter 5..5 — single-point overlap is still overlap
    expect(matchesAgeFilter(event(5, 5), 5, 5)).toBe(true)
  })
})

describe("normalizeKeyword", () => {
  it("trims and strips reserved chars", () => {
    expect(normalizeKeyword("  Frozen II! at 2pm  ")).toBe("Frozen II! at 2pm")
  })

  it("neutralizes filter-injection attempts", () => {
    expect(normalizeKeyword("evil),title.ilike.%")).not.toMatch(/[,.()%]/)
  })

  it("returns empty string for only-reserved input", () => {
    expect(normalizeKeyword(",.()*%_\"'")).toBe("")
  })

  it("omits reserved-only keyword searches from event list keys", () => {
    expect(
      qk.events.list({
        filters: { keyword: ",.()*%_\"'" },
        limit: 100,
        offset: 0,
      })
    ).toEqual(
      qk.events.list({
        filters: {},
        limit: 100,
        offset: 0,
      })
    )
  })
})
