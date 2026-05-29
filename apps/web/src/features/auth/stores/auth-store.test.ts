import type { Session } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { UserAccess, UserProfile } from "@/shared/types"

const {
  mockAuthSignOut,
  mockSignInWithOAuth,
  mockCaptureException,
  mockClearQueryCache,
  mockFrom,
  mockGetSession,
  mockOnAuthStateChange,
  mockRpc,
  mockSetSentryUserContext,
  state,
} = vi.hoisted(() => {
  const state = {
    profileResult: { data: null, error: null } as { data: unknown; error: unknown },
    accessResult: { data: null, error: null } as { data: unknown; error: unknown },
  }

  return {
    state,
    mockAuthSignOut: vi.fn(),
    mockSignInWithOAuth: vi.fn(),
    mockCaptureException: vi.fn(),
    mockClearQueryCache: vi.fn(),
    mockGetSession: vi.fn(),
    mockOnAuthStateChange: vi.fn(),
    mockRpc: vi.fn(),
    mockSetSentryUserContext: vi.fn(),
    mockFrom: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve(table === "user_profiles" ? state.profileResult : state.accessResult)
          ),
        })),
      })),
    })),
  }
})

vi.mock("@/infrastructure/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockAuthSignOut,
    },
    from: mockFrom,
    rpc: mockRpc,
  },
}))

vi.mock("@/infrastructure/queries/query-client", () => ({
  queryClient: {
    clear: mockClearQueryCache,
  },
}))

vi.mock("@/infrastructure/observability/sentry", () => ({
  Sentry: {
    captureException: mockCaptureException,
  },
  clearSentryUserContext: vi.fn(),
  setSentryUserContext: mockSetSentryUserContext,
}))

const profile = {
  id: "user-1",
  email: "parent@example.com",
  display_name: "Parent",
  role: "user",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
} as UserProfile

const enabledAccess = {
  user_id: "user-1",
  is_enabled: true,
  enabled_at: "2026-05-01T00:00:00.000Z",
  disabled_at: null,
  disabled_reason: null,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
} as UserAccess

function session(expiresAt = Math.floor(Date.now() / 1000) + 3600): Session {
  return {
    access_token: "token-1",
    refresh_token: "refresh-1",
    expires_at: expiresAt,
    token_type: "bearer",
    user: {
      id: "user-1",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-05-01T00:00:00.000Z",
    },
  } as Session
}

async function loadStore() {
  const { useAuthStore } = await import("./auth-store")
  return useAuthStore
}

function setAuthRows(access: UserAccess | null = enabledAccess, profileRow: UserProfile = profile) {
  state.profileResult = { data: profileRow, error: null }
  state.accessResult = { data: access, error: null }
}

async function flushPromises() {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  vi.resetModules()
  vi.useRealTimers()
  vi.clearAllMocks()
  setAuthRows()
  mockAuthSignOut.mockResolvedValue({ error: null })
  mockSignInWithOAuth.mockResolvedValue({ error: null })
  mockGetSession.mockResolvedValue({ data: { session: null } })
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
  mockRpc.mockResolvedValue({ data: null, error: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("useAuthStore", () => {
  it("syncs a valid session, profile, access row, and Sentry context", async () => {
    const useAuthStore = await loadStore()
    const activeSession = session()

    await useAuthStore.getState()._syncSession(activeSession)

    expect(mockRpc).toHaveBeenCalledWith("claim_pending_invite_access")
    expect(useAuthStore.getState()).toMatchObject({
      session: activeSession,
      user: activeSession.user,
      profile,
      access: enabledAccess,
      authError: null,
    })
    expect(mockSetSentryUserContext).toHaveBeenCalledWith({
      id: "user-1",
      role: "user",
      accessEnabled: true,
    })
  })

  it.each([
    ["missing", null, "does not have access"],
    ["disabled", { ...enabledAccess, is_enabled: false } as UserAccess, "disabled"],
  ])("signs out when access is %s", async (_label, accessRow, message) => {
    setAuthRows(accessRow)
    const useAuthStore = await loadStore()

    await expect(useAuthStore.getState()._syncSession(session())).rejects.toThrow(message)

    expect(mockAuthSignOut).toHaveBeenCalled()
    expect(mockClearQueryCache).toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      user: null,
      profile: null,
      access: null,
    })
  })

  it("surfaces the first profile load failure during auth init", async () => {
    state.profileResult = { data: null, error: new Error("profile unavailable") }
    mockGetSession.mockResolvedValue({ data: { session: session() } })
    const useAuthStore = await loadStore()

    const cleanup = useAuthStore.getState().initAuth()
    await flushPromises()

    expect(mockCaptureException).toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      user: null,
      authError: "profile unavailable",
      isLoading: false,
    })
    cleanup()
  })

  it("keeps existing profile state when a forced refresh fails", async () => {
    const useAuthStore = await loadStore()
    const activeSession = session()
    await useAuthStore.getState()._syncSession(activeSession)
    state.profileResult = { data: null, error: new Error("network down") }

    await expect(useAuthStore.getState()._syncSession(activeSession, true)).resolves.toBeUndefined()

    expect(mockCaptureException).toHaveBeenCalled()
    expect(useAuthStore.getState().profile).toEqual(profile)
    expect(useAuthStore.getState().access).toEqual(enabledAccess)
  })

  it("signs out when the expiry timer fires", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-22T12:00:00.000Z"))
    const useAuthStore = await loadStore()
    const expiringSession = session(Math.floor(Date.now() / 1000) + 1)

    await useAuthStore.getState()._syncSession(expiringSession)
    await vi.advanceTimersByTimeAsync(1000)

    expect(mockAuthSignOut).toHaveBeenCalled()
    expect(mockClearQueryCache).toHaveBeenCalled()
    expect(useAuthStore.getState().session).toBeNull()
  })

  it("signOut clears auth state and query cache", async () => {
    const useAuthStore = await loadStore()
    await useAuthStore.getState()._syncSession(session())

    await useAuthStore.getState().signOut()

    expect(mockAuthSignOut).toHaveBeenCalled()
    expect(mockClearQueryCache).toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      user: null,
      profile: null,
      access: null,
      authError: null,
    })
  })

  it("starts Google OAuth without forcing the consent screen", async () => {
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } })
    const useAuthStore = await loadStore()

    await useAuthStore.getState().signInWithProvider("google", { next: "/events/evt-1" })

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback?next=%2Fevents%2Fevt-1",
      },
    })
  })
})
