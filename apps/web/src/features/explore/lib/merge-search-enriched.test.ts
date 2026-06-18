import { describe, expect, it } from "vitest"
import { indexEnrichedById, mergeSearchWithEnriched } from "./merge-search-enriched"
import type { EventTag, EventWithDetails, Tag } from "@/shared/types"

// Minimal EventWithDetails factory: only the fields relevant to the merge.
function rawEvent(id: string, overrides: Partial<EventWithDetails> = {}): EventWithDetails {
  return {
    id,
    title: `Event ${id}`,
    description: null,
    start_datetime: "2026-06-01T10:00:00Z",
    end_datetime: null,
    timezone: "America/Chicago",
    venue_name: null,
    address: null,
    city_id: null,
    latitude: null,
    longitude: null,
    age_min: null,
    age_max: null,
    price: null,
    is_free: true,
    source_url: null,
    source_name: null,
    source_id: null,
    images: [],
    status: "published",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    // zero-filled enrichment fields (as returned by search_events)
    tags: [],
    avg_rating: 0,
    rating_count: 0,
    is_favorited: false,
    is_in_calendar: false,
    ...overrides,
  } as unknown as EventWithDetails
}

function enrichedEvent(id: string, overrides: Partial<EventWithDetails> = {}): EventWithDetails {
  return rawEvent(id, {
    tags: [
      {
        event_id: id,
        tag_id: "tag-1",
        confidence: 1,
        is_manual_override: false,
        created_at: "",
        tag: {
          id: "tag-1",
          name: "Music",
          slug: "music",
          color: "#ff0",
          category: "",
          is_system: false,
          created_at: "",
        },
      } as unknown as EventTag & { tag: Tag },
    ],
    avg_rating: 4.5,
    rating_count: 12,
    is_favorited: true,
    is_in_calendar: true,
    ...overrides,
  })
}

describe("mergeSearchWithEnriched", () => {
  it("returns empty array for empty search results", () => {
    const result = mergeSearchWithEnriched([], new Map())
    expect(result).toEqual([])
  })

  it("returns raw rows unchanged when enrichment map is empty", () => {
    const raw = [rawEvent("a"), rawEvent("b")]
    const result = mergeSearchWithEnriched(raw, new Map())
    expect(result).toEqual(raw)
    expect(result[0]!.tags).toEqual([])
    expect(result[0]!.avg_rating).toBe(0)
  })

  it("replaces enrichment fields with enriched values", () => {
    const raw = [rawEvent("a")]
    const enrichedMap = new Map([["a", enrichedEvent("a")]])
    const result = mergeSearchWithEnriched(raw, enrichedMap)

    expect(result).toHaveLength(1)
    expect(result[0]!.tags).toHaveLength(1)
    expect(result[0]!.avg_rating).toBe(4.5)
    expect(result[0]!.rating_count).toBe(12)
    expect(result[0]!.is_favorited).toBe(true)
    expect(result[0]!.is_in_calendar).toBe(true)
  })

  it("preserves non-enrichment fields from the raw row", () => {
    const raw = [rawEvent("a", { title: "Story Time", is_free: false })]
    const enrichedMap = new Map([["a", enrichedEvent("a")]])
    const result = mergeSearchWithEnriched(raw, enrichedMap)

    expect(result[0]!.title).toBe("Story Time")
    expect(result[0]!.is_free).toBe(false)
  })

  it("preserves search result ordering", () => {
    const raw = [rawEvent("c"), rawEvent("a"), rawEvent("b")]
    const enrichedMap = new Map([
      ["a", enrichedEvent("a")],
      ["b", enrichedEvent("b")],
      ["c", enrichedEvent("c")],
    ])
    const result = mergeSearchWithEnriched(raw, enrichedMap)

    expect(result.map((e) => e.id)).toEqual(["c", "a", "b"])
  })

  it("falls back to raw row when id is missing from enrichment", () => {
    const raw = [rawEvent("a"), rawEvent("b"), rawEvent("c")]
    // only 'a' and 'c' are in the enrichment map; 'b' is missing
    const enrichedMap = new Map([
      ["a", enrichedEvent("a")],
      ["c", enrichedEvent("c")],
    ])
    const result = mergeSearchWithEnriched(raw, enrichedMap)

    expect(result).toHaveLength(3)
    // 'a' enriched
    expect(result[0]!.avg_rating).toBe(4.5)
    // 'b' falls back to raw — zero-filled
    expect(result[1]!.avg_rating).toBe(0)
    expect(result[1]!.tags).toEqual([])
    // 'c' enriched
    expect(result[2]!.avg_rating).toBe(4.5)
  })

  it("handles partial enrichment: only some fields override", () => {
    const raw = [rawEvent("a")]
    // enriched provides non-default values for all enrichment fields
    const enriched = enrichedEvent("a", { is_favorited: false, rating_count: 0 })
    const enrichedMap = new Map([["a", enriched]])
    const result = mergeSearchWithEnriched(raw, enrichedMap)

    expect(result[0]!.is_favorited).toBe(false)
    expect(result[0]!.rating_count).toBe(0)
    expect(result[0]!.avg_rating).toBe(4.5)
    expect(result[0]!.tags).toHaveLength(1)
  })
})

describe("indexEnrichedById", () => {
  it("returns an empty map for an empty array", () => {
    const map = indexEnrichedById([])
    expect(map.size).toBe(0)
  })

  it("indexes events by id", () => {
    const events = [enrichedEvent("a"), enrichedEvent("b")]
    const map = indexEnrichedById(events)
    expect(map.size).toBe(2)
    expect(map.get("a")?.id).toBe("a")
    expect(map.get("b")?.id).toBe("b")
  })

  it("last-write wins when ids are duplicated", () => {
    const ev1 = enrichedEvent("a", { avg_rating: 1 })
    const ev2 = enrichedEvent("a", { avg_rating: 2 })
    const map = indexEnrichedById([ev1, ev2])
    expect(map.get("a")?.avg_rating).toBe(2)
  })
})
