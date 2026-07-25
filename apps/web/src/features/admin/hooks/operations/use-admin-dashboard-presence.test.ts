// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useAdminDashboardPresence } from "./use-admin-dashboard-presence"

const presenceMocks = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    presenceState: vi.fn(() => ({})),
    subscribe: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
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

vi.mock("@/features/auth/stores/auth-store", () => ({
  useAuthStore: (
    selector: (state: {
      profile: { display_name: string } | null
      user: { email: string; id: string } | null
    }) => unknown
  ) =>
    selector({
      profile: { display_name: "Admin" },
      user: { email: "admin@example.com", id: "admin-1" },
    }),
}))

vi.mock("@/infrastructure/observability/sentry", () => ({
  Sentry: {
    captureException: presenceMocks.captureException,
  },
}))

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    channel: presenceMocks.channelFactory,
    realtime: {
      setAuth: presenceMocks.setAuth,
    },
    removeChannel: presenceMocks.removeChannel,
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

beforeEach(() => {
  vi.clearAllMocks()
  presenceMocks.channel.on.mockReturnValue(presenceMocks.channel)
  presenceMocks.channel.presenceState.mockReturnValue({})
  presenceMocks.channel.untrack.mockResolvedValue(undefined)
  presenceMocks.removeChannel.mockResolvedValue(undefined)
})

describe("useAdminDashboardPresence failures", () => {
  it("captures a rejected setAuth once and never subscribes", async () => {
    const auth = deferred<void>()
    presenceMocks.setAuth.mockReturnValue(auth.promise)

    const { unmount } = renderHook(() => useAdminDashboardPresence())
    const error = new Error("setAuth rejected")
    auth.reject(error)

    await waitFor(() => {
      expect(presenceMocks.captureException).toHaveBeenCalledTimes(1)
    })
    expect(presenceMocks.captureException).toHaveBeenCalledWith(error, {
      tags: { area: "admin.presence" },
    })
    expect(presenceMocks.channel.subscribe).not.toHaveBeenCalled()

    unmount()
  })

  it("captures a rejected track once after subscribing", async () => {
    const auth = deferred<void>()
    const track = deferred<void>()
    const error = new Error("track rejected")
    presenceMocks.setAuth.mockReturnValue(auth.promise)
    presenceMocks.channel.subscribe.mockImplementation((callback: (status: string) => void) => {
      callback("SUBSCRIBED")
      return presenceMocks.channel
    })
    presenceMocks.channel.track.mockReturnValue(track.promise)

    const { unmount } = renderHook(() => useAdminDashboardPresence())
    auth.resolve()

    await waitFor(() => {
      expect(presenceMocks.channel.track).toHaveBeenCalledTimes(1)
    })
    track.reject(error)

    await waitFor(() => {
      expect(presenceMocks.captureException).toHaveBeenCalledTimes(1)
    })
    expect(presenceMocks.channel.track).toHaveBeenCalledTimes(1)
    expect(presenceMocks.captureException).toHaveBeenCalledWith(error, {
      tags: { area: "admin.presence" },
    })

    unmount()
  })
})
