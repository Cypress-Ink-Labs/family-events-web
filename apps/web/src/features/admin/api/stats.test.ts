import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchAdminStats } from "./stats"

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: { rpc: mockRpc },
}))

const payload = {
  total_events: 120,
  draft_events: 12,
  published_events: 100,
  ai_confidence: { high: 60, medium: 30, low: 10 },
  sources: { active: 8, errors: 2 },
  dead_letters: {
    tag_queue: 3,
    source_queue: 0,
    oldest_tag_dead_at: "2026-06-01T00:00:00Z",
    oldest_source_dead_at: null,
  },
  generated_at: "2026-06-10T00:00:00Z",
}

describe("fetchAdminStats", () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it("calls the admin_dashboard_stats RPC once and maps the payload", async () => {
    mockRpc.mockResolvedValue({ data: payload, error: null })

    const stats = await fetchAdminStats()

    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith("admin_dashboard_stats")
    expect(stats).toEqual({
      totalEvents: 120,
      pendingReview: 12,
      published: 100,
      activeSources: 8,
      sourceErrors: 2,
      aiBuckets: { high: 60, medium: 30, low: 10 },
      deadLetters: {
        tagQueue: 3,
        sourceQueue: 0,
        oldestTagDeadAt: "2026-06-01T00:00:00Z",
        oldestSourceDeadAt: null,
      },
    })
  })

  it("converts confidence counts to percentages that sum to 100", async () => {
    mockRpc.mockResolvedValue({
      data: { ...payload, ai_confidence: { high: 1, medium: 1, low: 1 } },
      error: null,
    })

    const stats = await fetchAdminStats()

    expect(stats.aiBuckets.high + stats.aiBuckets.medium + stats.aiBuckets.low).toBe(100)
  })

  it("handles zero confidence rows without dividing by zero", async () => {
    mockRpc.mockResolvedValue({
      data: { ...payload, ai_confidence: { high: 0, medium: 0, low: 0 } },
      error: null,
    })

    const stats = await fetchAdminStats()

    expect(stats.aiBuckets).toEqual({ high: 0, medium: 0, low: 100 })
  })

  it("throws the RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("forbidden") })

    await expect(fetchAdminStats()).rejects.toThrow("forbidden")
  })
})
