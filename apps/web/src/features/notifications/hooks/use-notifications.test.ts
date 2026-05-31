import { beforeEach, describe, expect, it, vi } from "vitest"
import { qk } from "@/infrastructure/queries/query-keys"

// Capture useEffect callbacks for synchronous testing
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

// Supabase channel mock
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

vi.mock("@/infrastructure/supabase/client", () => ({
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
    useQuery: vi.fn(
      ({ queryKey, enabled }: { queryKey: readonly unknown[]; enabled?: boolean }) => ({
        data: undefined,
        isLoading: enabled !== false,
        error: null,
        queryKey,
      })
    ),
    useMutation: vi.fn(({ mutationFn }: { mutationFn: (arg?: unknown) => Promise<unknown> }) => ({
      mutate: mutationFn,
      mutateAsync: mutationFn,
      isPending: false,
    })),
  }
})

// Mock the API module
vi.mock("@/features/notifications/api/notifications-api", () => ({
  fetchNotifications: vi.fn().mockResolvedValue([]),
  fetchUnreadCount: vi.fn().mockResolvedValue(0),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(async () => {
  capturedEffects.length = 0

  // Reset channel registry before mocks to avoid stale references
  const { __resetNotificationsChannelRegistry } =
    await import("@/features/notifications/lib/notifications-channel-registry")
  __resetNotificationsChannelRegistry()

  vi.clearAllMocks()
  channelObj.on.mockReturnValue(channelObj)
})

async function loadHooks() {
  return import("./use-notifications")
}

describe("useNotifications", () => {
  it("is disabled when userId is undefined", async () => {
    const { useQuery } = await import("@tanstack/react-query")
    const { useNotifications } = await loadHooks()

    useNotifications(undefined)

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it("is enabled with userId", async () => {
    const { useQuery } = await import("@tanstack/react-query")
    const { useNotifications } = await loadHooks()

    useNotifications("user-123")

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        queryKey: qk.notifications.byUser("user-123"),
      })
    )
  })
})

describe("useUnreadCount", () => {
  it("subscribes to realtime channel for the user", async () => {
    const { useUnreadCount } = await loadHooks()

    useUnreadCount("user-456")

    // Execute the captured useEffect
    expect(capturedEffects.length).toBeGreaterThanOrEqual(1)
    const cleanup = capturedEffects[0]()

    // The channel should have been created
    expect(mockChannel).toHaveBeenCalledWith("notifications:user-456")
    expect(channelObj.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "user_notifications",
        filter: "user_id=eq.user-456",
      }),
      expect.any(Function)
    )

    // Cleanup should unsubscribe
    if (typeof cleanup === "function") {
      cleanup()
    }
  })

  it("does not subscribe when userId is undefined", async () => {
    const { useUnreadCount } = await loadHooks()

    useUnreadCount(undefined)

    // Iterate captured effects — none should create a channel
    for (const effect of capturedEffects) {
      effect()
    }

    expect(mockChannel).not.toHaveBeenCalled()
  })

  it("invalidates queries when a realtime change arrives", async () => {
    const { useUnreadCount } = await loadHooks()

    useUnreadCount("user-789")

    // Execute useEffect
    capturedEffects[0]()

    // Get the onChange handler passed to `.on()`
    const onChangeHandler = channelObj.on.mock.calls[0][2] as () => void
    onChangeHandler()

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: qk.notifications.unreadCount("user-789"),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: qk.notifications.byUser("user-789"),
    })
  })
})

describe("useMarkRead", () => {
  it("calls markNotificationRead mutation", async () => {
    const { useMarkRead } = await loadHooks()
    const { markNotificationRead } = await import("@/features/notifications/api/notifications-api")

    const hook = useMarkRead("user-123")
    await hook.mutate("notif-abc")

    expect(markNotificationRead).toHaveBeenCalledWith("notif-abc")
  })
})

describe("useMarkAllRead", () => {
  it("calls markAllNotificationsRead mutation", async () => {
    const { useMarkAllRead } = await loadHooks()
    const { markAllNotificationsRead } =
      await import("@/features/notifications/api/notifications-api")

    const hook = useMarkAllRead("user-123")
    await hook.mutate()

    expect(markAllNotificationsRead).toHaveBeenCalled()
  })
})
