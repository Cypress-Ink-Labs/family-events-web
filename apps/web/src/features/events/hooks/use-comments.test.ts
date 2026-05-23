import { beforeEach, describe, expect, it, vi } from "vitest"
import { qk } from "@/lib/query-keys"

// Capture useEffect callbacks so we can invoke them synchronously in tests,
// bypassing the need for a DOM environment or React rendering infrastructure.
const capturedEffects: Array<() => (() => void) | void> = []

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react")
  return {
    ...actual,
    useEffect: vi.fn((fn: () => (() => void) | void) => {
      capturedEffects.push(fn)
    }),
  }
})

// Chainable supabase channel mock
const mockStatusCallback = { current: (_status: string) => {} }
const channelObj = {
  on: vi.fn(),
  subscribe: vi.fn((cb: (status: string) => void) => {
    mockStatusCallback.current = cb
    return channelObj
  }),
}
channelObj.on.mockReturnValue(channelObj)

const mockRemoveChannel = vi.fn().mockResolvedValue("ok")
const mockChannel = vi.fn().mockReturnValue(channelObj)

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined)
const mockQueryClient = { invalidateQueries: mockInvalidateQueries }

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query")
  return {
    ...actual,
    useQueryClient: vi.fn(() => mockQueryClient),
    useQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  }
})

async function loadHook() {
  const { useComments } = await import("./use-comments")
  return useComments
}

beforeEach(async () => {
  capturedEffects.length = 0
  // Reset the shared registry BEFORE clearAllMocks so any removeChannel calls
  // triggered by cleanup of leaked entries from prior tests don't show up in
  // the new test's mock call counts.
  const { __resetCommentsChannelRegistry } =
    await import("@/features/events/lib/comments-channel-registry")
  __resetCommentsChannelRegistry()
  vi.clearAllMocks()
  channelObj.on.mockReturnValue(channelObj)
  channelObj.subscribe.mockImplementation((cb: (status: string) => void) => {
    mockStatusCallback.current = cb
    return channelObj
  })
  mockChannel.mockReturnValue(channelObj)
})

describe("useComments Realtime subscription", () => {
  it("does not create a channel when eventId is undefined", async () => {
    const useComments = await loadHook()
    useComments(undefined)
    expect(capturedEffects).toHaveLength(1)
    capturedEffects[0]()
    expect(mockChannel).not.toHaveBeenCalled()
  })

  it("creates a channel scoped to the eventId on mount", async () => {
    const useComments = await loadHook()
    useComments("11111111-1111-4111-8111-111111111111")
    expect(capturedEffects).toHaveLength(1)
    capturedEffects[0]()
    expect(mockChannel).toHaveBeenCalledWith("comments:11111111-1111-4111-8111-111111111111")
  })

  it("subscribes with event:'*' and the correct filter", async () => {
    const useComments = await loadHook()
    useComments("11111111-1111-4111-8111-111111111111")
    capturedEffects[0]()
    expect(channelObj.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "comments",
        filter: "event_id=eq.11111111-1111-4111-8111-111111111111",
      },
      expect.any(Function)
    )
    expect(channelObj.subscribe).toHaveBeenCalled()
  })

  it("rejects invalid event ids before creating a channel", async () => {
    const useComments = await loadHook()
    useComments("event-abc")
    expect(() => capturedEffects[0]()).toThrow("Comment subscription eventId must be a UUID.")
    expect(mockChannel).not.toHaveBeenCalled()
  })

  it("calls invalidateQueries when a postgres_changes event fires (INSERT/UPDATE/DELETE)", async () => {
    const useComments = await loadHook()
    useComments("11111111-1111-4111-8111-111111111111")
    capturedEffects[0]()

    // Extract the postgres_changes callback registered via .on()
    const [, , onCallback] = channelObj.on.mock.calls[0]
    onCallback({})

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: qk.comments.byEvent("11111111-1111-4111-8111-111111111111"),
    })
  })

  it("calls removeChannel on unmount", async () => {
    const useComments = await loadHook()
    useComments("11111111-1111-4111-8111-111111111111")
    const cleanup = capturedEffects[0]()
    if (typeof cleanup === "function") cleanup()
    expect(mockRemoveChannel).toHaveBeenCalledWith(channelObj)
  })

  it("warns and schedules reconnect when CHANNEL_ERROR fires", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const useComments = await loadHook()
    useComments("11111111-1111-4111-8111-111111111111")
    capturedEffects[0]()
    mockStatusCallback.current("CHANNEL_ERROR")
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'subscription status "CHANNEL_ERROR" for event 11111111-1111-4111-8111-111111111111'
      )
    )
    warnSpy.mockRestore()
  })

  it("does not warn on SUBSCRIBED status", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const useComments = await loadHook()
    useComments("11111111-1111-4111-8111-111111111111")
    capturedEffects[0]()
    mockStatusCallback.current("SUBSCRIBED")
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("shares one channel across two subscribers for the same event id", async () => {
    const useComments = await loadHook()
    useComments("11111111-1111-4111-8111-111111111111")
    capturedEffects[0]()
    useComments("11111111-1111-4111-8111-111111111111")
    capturedEffects[1]()
    // Two mounts, same event id → only ONE Supabase channel created.
    expect(mockChannel).toHaveBeenCalledTimes(1)
    // Postgres event fires once → both subscribers' invalidations fire.
    const [, , onCallback] = channelObj.on.mock.calls[0]
    onCallback({})
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
  })

  it("StrictMode remount: removeChannel called on first cleanup before second mount", async () => {
    const useComments = await loadHook()
    // First mount
    useComments("11111111-1111-4111-8111-111111111111")
    const cleanup1 = capturedEffects[0]()
    // StrictMode unmounts immediately
    if (typeof cleanup1 === "function") cleanup1()
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    // Second mount
    capturedEffects.length = 0
    useComments("11111111-1111-4111-8111-111111111111")
    capturedEffects[0]()
    // Two mounts = two channel creations
    expect(mockChannel).toHaveBeenCalledTimes(2)
  })

  it("resubscribes when eventId changes", async () => {
    const useComments = await loadHook()
    // Mount with first eventId
    useComments("11111111-1111-4111-8111-111111111111")
    const cleanup1 = capturedEffects[0]()
    if (typeof cleanup1 === "function") cleanup1()

    // Mount with second eventId (simulates deps change → cleanup → re-run)
    capturedEffects.length = 0
    useComments("22222222-2222-4222-8222-222222222222")
    capturedEffects[0]()

    expect(mockChannel).toHaveBeenNthCalledWith(1, "comments:11111111-1111-4111-8111-111111111111")
    expect(mockChannel).toHaveBeenNthCalledWith(2, "comments:22222222-2222-4222-8222-222222222222")
  })
})
