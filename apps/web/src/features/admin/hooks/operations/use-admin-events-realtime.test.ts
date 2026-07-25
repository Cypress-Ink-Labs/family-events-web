// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query"
import { patchAdminEventsInfiniteCache, useAdminEventsRealtime } from "./use-admin-events-realtime"
import type { AdminEventsPageResult } from "@/lib/db/rpc-admin-events"
import type { Event } from "@/shared/types"

const realtimeMocks = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  channel.on.mockReturnValue(channel)

  return {
    captureException: vi.fn(),
    channel,
    channelFactory: vi.fn(() => channel),
    removeChannel: vi.fn(),
    setAuth: vi.fn(),
  }
})

vi.mock("@/infrastructure/observability/sentry", () => ({
  Sentry: {
    captureException: realtimeMocks.captureException,
  },
}))

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    channel: realtimeMocks.channelFactory,
    realtime: {
      setAuth: realtimeMocks.setAuth,
    },
    removeChannel: realtimeMocks.removeChannel,
  },
}))

interface Deferred<T> {
  promise: Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function renderRealtimeHook() {
  const queryClient = new QueryClient()
  return renderHook(() => useAdminEventsRealtime(), {
    wrapper: ({ children }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  realtimeMocks.channel.on.mockReturnValue(realtimeMocks.channel)
  realtimeMocks.removeChannel.mockResolvedValue(undefined)
})

function event(overrides: Partial<Event> & Pick<Event, "id">): Event {
  return {
    ...overrides,
    id: overrides.id,
    title: overrides.title ?? "Event",
    description: null,
    start_datetime: "2026-06-01T12:00:00.000Z",
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
    is_free: false,
    source_url: null,
    source_name: null,
    source_id: null,
    images: [],
    status: overrides.status ?? "draft",
    ai_confidence: null,
    ai_tag_provider: null,
    recurrence_info: null,
    is_featured: false,
    is_outdoor: null,
    view_count: 0,
    search_vector: null,
    admin_locked_fields: [],
    admin_last_edited_at: null,
    admin_last_edited_by: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ai_tag_model: null,
    ai_tag_status: null,
    llm_review_status: "not_required",
    llm_review_decision: null,
    llm_review_confidence: null,
    llm_review_reason: null,
    llm_review_flags: [],
    llm_review_provider: null,
    llm_review_model: null,
    llm_review_prompt_version: null,
    llm_reviewed_at: null,
    llm_review_error: null,
    submitted_by: null,
    last_enrichment_attempt_at: null,
    parent_tips: null,
    parent_tips_generated_at: null,
    parent_tips_provider: null,
    parent_tips_model: null,
    parent_tips_prompt_version: null,
  }
}

function cache(rows: Event[]): InfiniteData<AdminEventsPageResult> {
  return {
    pageParams: [{}],
    pages: [{ rows, totalCount: rows.length }],
  }
}

describe("patchAdminEventsInfiniteCache", () => {
  it("patches an existing event without replacing the whole list", () => {
    const original = cache([event({ id: "event-1", title: "Before" }), event({ id: "event-2" })])
    const updated = patchAdminEventsInfiniteCache(original, {
      payload: {
        operation: "UPDATE",
        record: event({ id: "event-1", title: "After" }),
        old_record: event({ id: "event-1", title: "Before" }),
      },
    })

    expect(updated).not.toBe(original)
    expect(updated?.pages[0].rows[0].title).toBe("After")
    expect(updated?.pages[0].rows[1]).toBe(original.pages[0].rows[1])
  })

  it("ignores inserted events that are not already in the loaded page", () => {
    const original = cache([event({ id: "event-1" })])
    const updated = patchAdminEventsInfiniteCache(original, {
      payload: {
        operation: "INSERT",
        record: event({ id: "event-2" }),
        old_record: null,
      },
    })

    expect(updated).toBe(original)
  })

  it("removes a deleted event from loaded pages", () => {
    const original = cache([event({ id: "event-1" }), event({ id: "event-2" })])
    const updated = patchAdminEventsInfiniteCache(original, {
      payload: {
        operation: "DELETE",
        record: null,
        old_record: event({ id: "event-1" }),
      },
    })

    expect(updated?.pages[0].rows.map((row) => row.id)).toEqual(["event-2"])
    expect(updated?.pages[0].totalCount).toBe(1)
  })
})

describe("useAdminEventsRealtime auth failures", () => {
  it("captures a rejected setAuth once and never subscribes", async () => {
    const auth = deferred<void>()
    realtimeMocks.setAuth.mockReturnValue(auth.promise)

    const { unmount } = renderRealtimeHook()
    const error = new Error("setAuth rejected")
    auth.reject(error)

    await waitFor(() => {
      expect(realtimeMocks.captureException).toHaveBeenCalledTimes(1)
    })
    expect(realtimeMocks.captureException).toHaveBeenCalledWith(error, {
      tags: { area: "admin.realtime" },
    })
    expect(realtimeMocks.channel.subscribe).not.toHaveBeenCalled()

    unmount()
  })

  it("does not subscribe or capture when unmounted before setAuth resolves", async () => {
    const auth = deferred<void>()
    realtimeMocks.setAuth.mockReturnValue(auth.promise)

    const { unmount } = renderRealtimeHook()
    unmount()
    auth.resolve()
    await Promise.resolve()

    expect(realtimeMocks.channel.subscribe).not.toHaveBeenCalled()
    expect(realtimeMocks.captureException).not.toHaveBeenCalled()
  })

  it("does not subscribe or capture when unmounted before setAuth rejects", async () => {
    const auth = deferred<void>()
    realtimeMocks.setAuth.mockReturnValue(auth.promise)

    const { unmount } = renderRealtimeHook()
    unmount()
    auth.reject(new Error("setAuth rejected after unmount"))
    await Promise.resolve()

    expect(realtimeMocks.channel.subscribe).not.toHaveBeenCalled()
    expect(realtimeMocks.captureException).not.toHaveBeenCalled()
  })
})
