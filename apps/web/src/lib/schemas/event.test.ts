import { describe, expect, it } from "vitest"
import { enrichedEventRowSchema, eventRowSchema } from "./event"

const baseEventRow = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Test Event",
  description: null,
  start_datetime: "2026-05-12T20:00:00Z",
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
  ai_confidence: null,
  ai_tag_provider: null,
  recurrence_info: null,
  is_featured: false,
  view_count: 0,
  search_vector: null,
  created_at: "2026-05-12T00:00:00Z",
  updated_at: "2026-05-12T00:00:00Z",
}

describe("eventRowSchema", () => {
  it("accepts a fully-populated valid row", () => {
    const parsed = eventRowSchema.parse(baseEventRow)
    expect(parsed.id).toBe(baseEventRow.id)
    expect(parsed.images).toEqual([])
  })

  it("normalizes null images to empty array", () => {
    const parsed = eventRowSchema.parse({ ...baseEventRow, images: null })
    expect(parsed.images).toEqual([])
  })

  it("rejects rows missing required fields", () => {
    const { id: _, ...missingId } = baseEventRow
    const result = eventRowSchema.safeParse(missingId)
    expect(result.success).toBe(false)
  })

  it("rejects invalid status enum values", () => {
    const result = eventRowSchema.safeParse({ ...baseEventRow, status: "deleted" })
    expect(result.success).toBe(false)
  })

  it("rejects non-boolean is_free", () => {
    const result = eventRowSchema.safeParse({ ...baseEventRow, is_free: "yes" })
    expect(result.success).toBe(false)
  })
})

describe("enrichedEventRowSchema", () => {
  it("accepts the events_enriched RPC shape with tags + ratings", () => {
    const parsed = enrichedEventRowSchema.parse({
      ...baseEventRow,
      tags: [{ id: "tag-1", name: "Outdoor", slug: "outdoor", color: "#fff" }],
      avg_rating: 4.2,
      rating_count: 12,
      is_favorited: true,
      is_in_calendar: false,
    })
    expect(parsed.tags).toHaveLength(1)
    expect(parsed.avg_rating).toBe(4.2)
    expect(parsed.is_favorited).toBe(true)
  })

  it("defaults missing enrichment fields", () => {
    const parsed = enrichedEventRowSchema.parse(baseEventRow)
    expect(parsed.tags).toEqual([])
    expect(parsed.avg_rating).toBe(0)
    expect(parsed.rating_count).toBe(0)
    expect(parsed.is_favorited).toBe(false)
    expect(parsed.is_in_calendar).toBe(false)
  })

  it("coerces numeric strings on avg_rating / rating_count", () => {
    const parsed = enrichedEventRowSchema.parse({
      ...baseEventRow,
      avg_rating: "3.5",
      rating_count: "7",
    })
    expect(parsed.avg_rating).toBe(3.5)
    expect(parsed.rating_count).toBe(7)
  })

  it("treats null avg_rating / rating_count as 0", () => {
    const parsed = enrichedEventRowSchema.parse({
      ...baseEventRow,
      avg_rating: null,
      rating_count: null,
    })
    expect(parsed.avg_rating).toBe(0)
    expect(parsed.rating_count).toBe(0)
  })
})
