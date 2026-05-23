import { describe, expect, it, vi } from "vitest"

import { fetchAdminEventsPage } from "./rpc-admin-events"
import { supabase } from "@/lib/supabase/client"

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

describe("fetchAdminEventsPage", () => {
  const mockRpc = vi.mocked(supabase.rpc)
  const mockRpcResponse = <T>(data: T) =>
    ({
      data,
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
      success: true,
    }) as Parameters<typeof mockRpc.mockResolvedValueOnce>[0]

  const event = (overrides: Record<string, unknown> = {}) => ({
    id: `event-${Math.random()}`,
    title: "Local",
    description: null,
    start_datetime: "2026-05-01T00:00:00Z",
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
    status: "draft" as const,
    ai_confidence: null,
    ai_tag_provider: null,
    ai_tag_model: null,
    ai_tag_status: null,
    llm_review_status: "not_required" as const,
    llm_review_decision: null,
    llm_review_confidence: null,
    llm_review_reason: null,
    llm_review_flags: [],
    llm_review_provider: null,
    llm_review_model: null,
    llm_review_prompt_version: null,
    llm_reviewed_at: null,
    llm_review_error: null,
    recurrence_info: null,
    is_featured: false,
    view_count: 0,
    search_vector: null,
    admin_locked_fields: [],
    is_outdoor: null,
    admin_last_edited_at: null,
    admin_last_edited_by: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  })

  it("builds RPC params for first page and cursor page", async () => {
    mockRpc.mockResolvedValueOnce(
      mockRpcResponse([
        {
          ...event({ id: "first-event", total_count: 99 }),
        },
      ])
    )

    await fetchAdminEventsPage({
      status: "draft",
      cityId: "city-1",
      cityIsNull: undefined,
      keyword: "  cat and dog ",
      limit: 200,
    })

    expect(mockRpc).toHaveBeenCalledWith("admin_events_enriched", {
      p_status: "draft",
      p_city_id: "city-1",
      p_city_is_null: undefined,
      p_keyword: "cat and dog",
      p_after_created_at: undefined,
      p_after_id: undefined,
      p_limit: 200,
      p_llm_review_status: undefined,
      p_llm_review_decision: undefined,
    })

    mockRpc.mockResolvedValueOnce(
      mockRpcResponse([
        {
          ...event({ id: "second-event", total_count: 99, created_at: "2026-05-01T00:00:00Z" }),
        },
      ])
    )

    await fetchAdminEventsPage(
      { status: "draft", limit: 25 },
      {
        afterCreatedAt: "2026-05-01T00:00:00Z",
        afterId: "first-event",
      }
    )

    expect(mockRpc).toHaveBeenCalledWith("admin_events_enriched", {
      p_status: "draft",
      p_city_id: undefined,
      p_city_is_null: undefined,
      p_keyword: undefined,
      p_after_created_at: "2026-05-01T00:00:00Z",
      p_after_id: "first-event",
      p_limit: 25,
      p_llm_review_status: undefined,
      p_llm_review_decision: undefined,
    })
  })

  it("passes llm review filters to admin_events_enriched", async () => {
    mockRpc.mockResolvedValueOnce(
      mockRpcResponse([
        {
          ...event({ id: "filtered", total_count: 1 }),
        },
      ])
    )

    await fetchAdminEventsPage({
      llmReviewStatus: "failed",
      llmReviewDecision: "needs_admin_review",
      limit: 20,
    })

    expect(mockRpc).toHaveBeenLastCalledWith("admin_events_enriched", {
      p_status: undefined,
      p_city_id: undefined,
      p_city_is_null: undefined,
      p_keyword: undefined,
      p_after_created_at: undefined,
      p_after_id: undefined,
      p_limit: 20,
      p_llm_review_status: "failed",
      p_llm_review_decision: "needs_admin_review",
    })
  })

  it("returns totalCount from total_count column", async () => {
    mockRpc.mockResolvedValueOnce(
      mockRpcResponse([
        {
          ...event({ id: "row-1", total_count: "101", created_at: "2026-05-01T01:00:00Z" }),
        },
        {
          ...event({ id: "row-2", total_count: "101", created_at: "2026-05-01T00:00:00Z" }),
        },
      ])
    )

    const page = await fetchAdminEventsPage({ limit: 2 })
    expect(page.totalCount).toBe(101)
    expect(page.rows).toHaveLength(2)
  })

  it("returns nextCursor only when more rows remain", async () => {
    mockRpc.mockResolvedValueOnce(
      mockRpcResponse([
        {
          ...event({ id: "one", total_count: 3, created_at: "2026-05-01T01:00:00Z" }),
        },
        {
          ...event({ id: "two", total_count: 3, created_at: "2026-05-01T00:00:00Z" }),
        },
      ])
    )

    const first = await fetchAdminEventsPage({ limit: 2 })
    expect(first.nextCursor).toEqual({
      afterCreatedAt: "2026-05-01T00:00:00Z",
      afterId: "two",
    })

    mockRpc.mockResolvedValueOnce(
      mockRpcResponse([
        {
          ...event({ id: "three", total_count: 3, created_at: "2025-12-31T23:00:00Z" }),
        },
      ])
    )

    const second = await fetchAdminEventsPage({ limit: 2 }, first.nextCursor)
    expect(second.nextCursor).toBeUndefined()
  })
})
