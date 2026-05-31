import { describe, expect, it, vi, beforeEach } from "vitest"
import { searchEvents } from "./search-api"
import { supabase } from "@/infrastructure/supabase/client"

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

const mockRpc = vi.mocked(supabase.rpc)

function mockRpcResponse<T>(data: T) {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
    success: true,
  } as Parameters<typeof mockRpc.mockResolvedValueOnce>[0]
}

function fakeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Event",
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
    ...overrides,
  }
}

describe("searchEvents", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("calls search_events RPC with keyword and city", async () => {
    const events = [fakeEvent({ title: "Story Time" })]
    mockRpc.mockResolvedValueOnce(mockRpcResponse(events))

    const result = await searchEvents({ keyword: "story", cityId: "city-1" })

    expect(mockRpc).toHaveBeenCalledOnce()
    const [rpcName, args] = mockRpc.mock.calls[0]!
    expect(rpcName).toBe("search_events")
    expect(args).toMatchObject({
      p_keyword: "story",
      p_city_id: "city-1",
    })
    expect(result.events).toHaveLength(1)
    expect(result.events[0]!.title).toBe("Story Time")
  })

  it("passes radius params when provided", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await searchEvents({ lat: 30.45, lng: -91.18, radiusKm: 10 })

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_lat: 30.45,
      p_lng: -91.18,
      p_radius_km: 10,
    })
  })

  it("passes cursor params for pagination", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await searchEvents({
      afterStartDatetime: "2026-06-01T10:00:00Z",
      afterId: "evt-abc",
    })

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_after_start_datetime: "2026-06-01T10:00:00Z",
      p_after_id: "evt-abc",
    })
  })

  it("returns nextCursor when page is full", async () => {
    // Default page size is 24, so 24 events = full page
    const events = Array.from({ length: 24 }, (_, i) =>
      fakeEvent({
        id: `evt-${i}`,
        start_datetime: `2026-06-0${(i % 9) + 1}T10:00:00Z`,
      })
    )
    mockRpc.mockResolvedValueOnce(mockRpcResponse(events))

    const result = await searchEvents({})

    expect(result.nextCursor).not.toBeNull()
    expect(result.nextCursor!.afterId).toBe("evt-23")
  })

  it("returns null nextCursor when page is not full", async () => {
    const events = [fakeEvent()]
    mockRpc.mockResolvedValueOnce(mockRpcResponse(events))

    const result = await searchEvents({})

    expect(result.nextCursor).toBeNull()
  })

  it("returns empty tags and zero ratings for search results", async () => {
    const events = [fakeEvent()]
    mockRpc.mockResolvedValueOnce(mockRpcResponse(events))

    const result = await searchEvents({})

    expect(result.events[0]!.tags).toEqual([])
    expect(result.events[0]!.avg_rating).toBe(0)
    expect(result.events[0]!.rating_count).toBe(0)
    expect(result.events[0]!.is_favorited).toBe(false)
    expect(result.events[0]!.is_in_calendar).toBe(false)
  })

  it("passes tag slugs and free filter", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await searchEvents({
      tagSlugs: ["music", "outdoor"],
      isFree: true,
    })

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_tag_slugs: ["music", "outdoor"],
      p_is_free: true,
    })
  })

  it("omits undefined optional params", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await searchEvents({})

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_keyword: undefined,
      p_city_id: undefined,
      p_lat: undefined,
      p_lng: undefined,
      p_radius_km: undefined,
    })
  })

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc failed", code: "42000", details: "", hint: "" },
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    } as Parameters<typeof mockRpc.mockResolvedValueOnce>[0])

    await expect(searchEvents({})).rejects.toMatchObject({ message: "rpc failed" })
  })
})
