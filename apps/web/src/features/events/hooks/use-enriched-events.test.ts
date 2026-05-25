import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  adaptEnrichedRow,
  buildEnrichedQueryKey,
  buildEnrichedRpcArgs,
} from "./use-enriched-events"

function baseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "evt-1",
    title: "Storytime",
    description: "Books + songs",
    start_datetime: "2026-05-01T15:00:00Z",
    end_datetime: null,
    timezone: "America/New_York",
    venue_name: "Library",
    address: "1 Main",
    city_id: "city-1",
    latitude: 42.36,
    longitude: -71.05,
    age_min: 0,
    age_max: 5,
    price: 0,
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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    avg_rating: 0,
    rating_count: 0,
    tags: [],
    is_favorited: false,
    is_in_calendar: false,
    ...overrides,
  }
}

describe("adaptEnrichedRow", () => {
  it("defaults missing aggregates to safe values", () => {
    const result = adaptEnrichedRow(baseRow({ avg_rating: null, rating_count: null, tags: null }))
    expect(result.avg_rating).toBe(0)
    expect(result.rating_count).toBe(0)
    expect(result.tags).toEqual([])
  })

  it("coerces is_favorited / is_in_calendar to strict booleans", () => {
    const result = adaptEnrichedRow(baseRow({ is_favorited: null, is_in_calendar: undefined }))
    expect(result.is_favorited).toBe(false)
    expect(result.is_in_calendar).toBe(false)
  })

  it("adapts flat tag jsonb into the EventTag + Tag nested shape", () => {
    const result = adaptEnrichedRow(
      baseRow({
        tags: [
          { id: "tag-1", name: "Outdoor", slug: "outdoor", color: "#00ff00" },
          { id: "tag-2", name: "Free", slug: "free", color: "#0000ff" },
        ],
      })
    )

    expect(result.tags).toHaveLength(2)
    expect(result.tags?.[0]).toMatchObject({
      event_id: "evt-1",
      tag_id: "tag-1",
      tag: { id: "tag-1", name: "Outdoor", slug: "outdoor", color: "#00ff00" },
    })
  })

  it("drops malformed tag entries rather than throwing", () => {
    const result = adaptEnrichedRow(
      baseRow({
        tags: [
          { id: "tag-1", name: "Outdoor", slug: "outdoor", color: "#0f0" },
          null,
          "not-a-tag",
          { name: "no-id-field" },
        ],
      })
    )
    expect(result.tags).toHaveLength(1)
    expect(result.tags?.[0]?.tag_id).toBe("tag-1")
  })

  it("preserves ai_tag_provider so downstream consumers can read it", () => {
    const result = adaptEnrichedRow(baseRow({ ai_tag_provider: "openai" }))
    expect(result.ai_tag_provider).toBe("openai")
  })

  it("guarantees images is an array even if RPC hands back non-array json", () => {
    const result = adaptEnrichedRow(baseRow({ images: null }))
    expect(Array.isArray(result.images)).toBe(true)
    expect(result.images).toHaveLength(0)
  })

  it("preserves public image attributions", () => {
    const result = adaptEnrichedRow(
      baseRow({
        image_attributions: [
          {
            provider: "unsplash",
            image_url: "https://images.unsplash.com/photo.jpg",
            matched_tag: "museum",
            photo_id: "abc",
            photographer_name: "Jane Doe",
            photographer_username: "jane",
            photographer_profile_url: "https://unsplash.com/@jane",
            photo_url: "https://unsplash.com/photos/abc",
          },
        ],
      })
    )

    expect(result.image_attributions).toEqual([
      {
        provider: "unsplash",
        image_url: "https://images.unsplash.com/photo.jpg",
        matched_tag: "museum",
        photo_id: "abc",
        photographer_name: "Jane Doe",
        photographer_username: "jane",
        photographer_profile_url: "https://unsplash.com/@jane",
        photo_url: "https://unsplash.com/photos/abc",
      },
    ])
  })
})

describe("buildEnrichedRpcArgs", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-17T16:30:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("elides city/status/limit when eventIds is set (RPC ignores them)", () => {
    const args = buildEnrichedRpcArgs({
      eventIds: ["a", "b"],
      cityId: "city-1",
      status: "draft",
      limit: 50,
      userId: "user-1",
    })
    expect(args.p_event_ids).toEqual(["a", "b"])
    expect(args.p_city_id).toBeUndefined()
    expect(args.p_status).toBeUndefined()
    expect(args.p_limit).toBeUndefined()
    expect(args.p_user_id).toBe("user-1")
  })

  it("passes city/status/limit on the list path and serializes date bounds", () => {
    const dateFrom = new Date("2026-05-01T00:00:00Z")
    const dateTo = new Date("2026-05-31T23:59:59Z")
    const args = buildEnrichedRpcArgs({ cityId: "city-1", dateFrom, dateTo })

    expect(args.p_city_id).toBe("city-1")
    expect(args.p_status).toBe("published")
    expect(args.p_limit).toBe(100)
    expect(args.p_event_ids).toBeUndefined()
    expect(args.p_date_from).toBe(dateFrom.toISOString())
    expect(args.p_date_to).toBe(dateTo.toISOString())
  })

  it("passes ISO date strings through untouched", () => {
    const iso = "2026-06-01T12:00:00.000Z"
    const args = buildEnrichedRpcArgs({ dateFrom: iso })
    expect(args.p_date_from).toBe(iso)
  })

  it("defaults list queries to upcoming events", () => {
    const args = buildEnrichedRpcArgs({})
    const start = new Date("2026-05-17T16:30:00.000Z")
    start.setHours(0, 0, 0, 0)

    expect(args.p_date_from).toBe(start.toISOString())
  })

  it("allows list queries to include past events", () => {
    const args = buildEnrichedRpcArgs({ includePast: true })
    expect(args.p_date_from).toBeUndefined()
  })
})

describe("buildEnrichedQueryKey", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-17T16:30:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("emits the by-ids key shape with sorted ids when eventIds is set", () => {
    const key = buildEnrichedQueryKey({
      eventIds: ["c", "a", "b"],
      userId: "user-1",
      // These fields are ignored on the by-ids path:
      cityId: "city-1",
      status: "draft",
      dateFrom: "2026-05-01T00:00:00Z",
    })
    expect(key).toEqual(["events-enriched", "by-ids", ["a", "b", "c"], "user-1"])
  })

  it("returns a stable by-ids key regardless of caller id order", () => {
    const a = buildEnrichedQueryKey({ eventIds: ["a", "b", "c"] })
    const b = buildEnrichedQueryKey({ eventIds: ["c", "b", "a"] })
    expect(a).toEqual(b)
  })

  it("includes date bounds in the list-path key so month navigation does not collide", () => {
    const may = buildEnrichedQueryKey({
      cityId: "city-1",
      dateFrom: "2026-05-01T00:00:00Z",
      dateTo: "2026-05-31T23:59:59Z",
    })
    const june = buildEnrichedQueryKey({
      cityId: "city-1",
      dateFrom: "2026-06-01T00:00:00Z",
      dateTo: "2026-06-30T23:59:59Z",
    })
    expect(may).not.toEqual(june)
  })

  it("defaults missing list-path fields to today / 'published'", () => {
    const key = buildEnrichedQueryKey({})
    const start = new Date("2026-05-17T16:30:00.000Z")
    start.setHours(0, 0, 0, 0)

    expect(key).toEqual([
      "events-enriched",
      {
        cityId: null,
        status: "published",
        userId: null,
        limit: 100,
        dateFrom: start.toISOString(),
        dateTo: null,
      },
    ])
  })

  it("uses a distinct list-path key when past events are included", () => {
    expect(buildEnrichedQueryKey({ includePast: true })).toEqual([
      "events-enriched",
      {
        cityId: null,
        status: "published",
        userId: null,
        limit: 100,
        dateFrom: null,
        dateTo: null,
      },
    ])
  })

  it("separates list-path keys by limit", () => {
    expect(buildEnrichedQueryKey({ limit: 24 })).not.toEqual(buildEnrichedQueryKey({ limit: 48 }))
  })
})
