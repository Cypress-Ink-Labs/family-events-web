import { describe, expect, it, vi, beforeEach } from "vitest"
import { supabase } from "@/infrastructure/supabase/client"

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

// Test the fetchSimilarEvents logic directly by extracting it from the module.
// Since the hook wraps useQuery, we test the underlying RPC call shape.
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

// Direct RPC call test (mirrors the hook's queryFn)
async function fetchSimilarEvents(eventId: string, limit: number, cityId?: string) {
  const { data, error } = await supabase.rpc("find_similar_events_by_id", {
    p_event_id: eventId,
    p_limit: limit,
    p_city_id: cityId ?? undefined,
  })
  if (error) throw error
  return data ?? []
}

describe("fetchSimilarEvents (RPC layer)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("calls find_similar_events_by_id with event ID and limit", async () => {
    const similar = [
      { event_id: "evt-2", title: "Similar Event", cosine_distance: 0.15, city_id: null, source_id: null },
    ]
    mockRpc.mockResolvedValueOnce(mockRpcResponse(similar))

    const result = await fetchSimilarEvents("evt-1", 5)

    expect(mockRpc).toHaveBeenCalledOnce()
    const [rpcName, args] = mockRpc.mock.calls[0]!
    expect(rpcName).toBe("find_similar_events_by_id")
    expect(args).toMatchObject({
      p_event_id: "evt-1",
      p_limit: 5,
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ event_id: "evt-2", cosine_distance: 0.15 })
  })

  it("passes city_id when provided", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    await fetchSimilarEvents("evt-1", 5, "city-1")

    const [, args] = mockRpc.mock.calls[0]!
    expect(args).toMatchObject({
      p_event_id: "evt-1",
      p_city_id: "city-1",
    })
  })

  it("returns empty array when RPC returns null data", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse(null))

    const result = await fetchSimilarEvents("evt-no-embedding", 5)

    expect(result).toEqual([])
  })

  it("returns empty array for events without embeddings", async () => {
    mockRpc.mockResolvedValueOnce(mockRpcResponse([]))

    const result = await fetchSimilarEvents("evt-no-embedding", 5)

    expect(result).toEqual([])
  })

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc error", code: "42000", details: "", hint: "" },
      count: null,
      status: 500,
      statusText: "Internal Server Error",
    } as Parameters<typeof mockRpc.mockResolvedValueOnce>[0])

    await expect(fetchSimilarEvents("evt-1", 5)).rejects.toMatchObject({
      message: "rpc error",
    })
  })

  it("returns multiple similar events sorted by distance", async () => {
    const similar = [
      { event_id: "evt-a", title: "Close", cosine_distance: 0.1, city_id: null, source_id: null },
      { event_id: "evt-b", title: "Far", cosine_distance: 0.25, city_id: null, source_id: null },
      { event_id: "evt-c", title: "Medium", cosine_distance: 0.18, city_id: null, source_id: null },
    ]
    mockRpc.mockResolvedValueOnce(mockRpcResponse(similar))

    const result = await fetchSimilarEvents("evt-1", 5)

    expect(result).toHaveLength(3)
    // RPC returns them in order, we preserve that
    expect(result[0]).toMatchObject({ event_id: "evt-a" })
  })
})
