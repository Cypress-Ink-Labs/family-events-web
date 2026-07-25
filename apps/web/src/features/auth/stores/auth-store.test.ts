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
  avatar_url: null,
  role: "user",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  child_name: null,
  child_age: null,
  city_preference_id: null,
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
function sessionFor(userId: string, accessToken: string): Session {
  const activeSession = session()

  return {
    ...activeSession,
    access_token: accessToken,
    refresh_token: `refresh-${userId}`,
    user: {
      ...activeSession.user,
      id: userId,
    },
  }
}

function createDeferred<T>() {
  let resolvePromise!: (value: T) => void
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })

  return { promise, resolve: resolvePromise }
}

function mockProfileAndAccessLoader(
  loader: (userId: string) => Promise<{ profile: UserProfile | null; access: UserAccess | null }>
) {
  vi.doMock("@/features/auth/api/load-profile-and-access", () => ({
    claimPendingInviteAccess: vi.fn().mockResolvedValue(undefined),
    loadProfileAndAccess: loader,
  }))
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
  vi.doUnmock("@/features/auth/api/load-profile-and-access")
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

  it("keeps a newer session's profile, access, and Sentry context when an older load resolves last", async () => {
    const profileA: UserProfile = {
      ...profile,
      id: "user-a",
      email: "a@example.com",
      display_name: "User A",
    }
    const accessA: UserAccess = {
      ...enabledAccess,
      user_id: "user-a",
    }
    const profileB: UserProfile = {
      ...profile,
      id: "user-b",
      email: "b@example.com",
      display_name: "User B",
      role: "admin",
    }
    const accessB: UserAccess = {
      ...enabledAccess,
      user_id: "user-b",
    }
    const profileLoadA = createDeferred<{ profile: UserProfile; access: UserAccess }>()
    const profileLoadB = createDeferred<{ profile: UserProfile; access: UserAccess }>()
    const mockLoadProfileAndAccess = vi.fn((userId: string) => {
      if (userId === "user-a") return profileLoadA.promise
      if (userId === "user-b") return profileLoadB.promise
      throw new Error(`Unexpected user ${userId}`)
    })
    mockProfileAndAccessLoader(mockLoadProfileAndAccess)
    const useAuthStore = await loadStore()

    const syncA = useAuthStore.getState()._syncSession(sessionFor("user-a", "token-a"))
    await flushPromises()
    const syncB = useAuthStore.getState()._syncSession(sessionFor("user-b", "token-b"))
    await flushPromises()

    profileLoadB.resolve({ profile: profileB, access: accessB })
    await syncB
    profileLoadA.resolve({ profile: profileA, access: accessA })
    await syncA

    expect(useAuthStore.getState()).toMatchObject({
      profile: profileB,
      access: accessB,
    })
    expect(mockSetSentryUserContext).toHaveBeenLastCalledWith({
      id: "user-b",
      role: "admin",
      accessEnabled: true,
    })
  })

  it("does not restore profile, access, or Sentry context when a load resolves after sign-out", async () => {
    const profileA: UserProfile = {
      ...profile,
      id: "user-a",
      email: "a@example.com",
      display_name: "User A",
    }
    const accessA: UserAccess = {
      ...enabledAccess,
      user_id: "user-a",
    }
    const profileLoadA = createDeferred<{ profile: UserProfile; access: UserAccess }>()
    const mockLoadProfileAndAccess = vi.fn((userId: string) => {
      if (userId === "user-a") return profileLoadA.promise
      throw new Error(`Unexpected user ${userId}`)
    })
    mockProfileAndAccessLoader(mockLoadProfileAndAccess)
    const useAuthStore = await loadStore()

    const syncA = useAuthStore.getState()._syncSession(sessionFor("user-a", "token-a"))
    await flushPromises()
    await useAuthStore.getState().signOut()
    profileLoadA.resolve({ profile: profileA, access: accessA })
    await syncA

    expect(useAuthStore.getState()).toMatchObject({
      profile: null,
      access: null,
    })
    expect(mockSetSentryUserContext).not.toHaveBeenCalled()
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

  it("uses the configured site URL for OAuth redirects", async () => {
    vi.stubEnv("VITE_SITE_URL", "https://family-events.org")
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } })
    const useAuthStore = await loadStore()

    await useAuthStore.getState().signInWithProvider("google", { next: "/events/evt-1" })

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://family-events.org/auth/callback?next=%2Fevents%2Fevt-1",
      },
    })
  })
})
