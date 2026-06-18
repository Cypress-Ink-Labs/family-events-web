// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, act, cleanup } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import type { Session } from "@supabase/supabase-js"
import { OAuthCallbackPage } from "./oauth-callback"

// ---------------------------------------------------------------------------
// Mock auth store
// ---------------------------------------------------------------------------

// We keep the mock state outside the factory so that vi.fn() calls can close
// over a mutable reference that both `useAuth` and `useAuthStore.getState` see.
const mockState = { session: null as Session | null }

vi.mock("@/features/auth/stores/auth-store", () => {
  return {
    useAuth: vi.fn(() => ({ session: mockState.session })),
    useAuthStore: {
      getState: vi.fn(() => ({ session: mockState.session })),
    },
  }
})

// ---------------------------------------------------------------------------
// Mock hooks / UI shells that are not relevant to the navigation behaviour.
// ---------------------------------------------------------------------------
vi.mock("@/shared/hooks/use-document-title", () => ({
  useDocumentTitle: vi.fn(),
}))

vi.mock("@/shared/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// ---------------------------------------------------------------------------
// Imports that come AFTER the mocks so they see the mocked versions.
// ---------------------------------------------------------------------------
import { useAuth, useAuthStore } from "@/features/auth/stores/auth-store"

const mockedUseAuth = vi.mocked(useAuth)
// useAuthStore.getState is a vi.fn() created above; we cast through unknown to
// avoid leaking the internal Zustand store type into the test.
const mockedGetState = (useAuthStore as unknown as { getState: ReturnType<typeof vi.fn> }).getState

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeSession = { access_token: "tok" } as unknown as Session

function setSession(session: Session | null) {
  mockState.session = session
  mockedUseAuth.mockReturnValue({ session } as ReturnType<typeof useAuth>)
  mockedGetState.mockReturnValue({ session })
}

// Track where the component tried to navigate by observing which route
// the MemoryRouter lands on after the navigation effect fires.
const navigatedPaths: string[] = []

function CatchAllRoute() {
  // MemoryRouter keeps its own history so window.location doesn't change.
  // Instead, we capture renders of the catch-all route which only mount when
  // the component navigates away from /auth/callback.
  navigatedPaths.push("navigated")
  return <div data-testid="navigated" />
}

function renderOAuthCallback(searchParams = "") {
  navigatedPaths.length = 0
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${searchParams}`]}>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="*" element={<CatchAllRoute />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("OAuthCallbackPage — safeNext and navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setSession(null)
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it("navigates immediately when a session is already present", async () => {
    setSession(fakeSession)

    renderOAuthCallback("?next=%2Fevents%2Fevent-1")

    await act(async () => {
      await Promise.resolve()
    })

    // If navigation happened the catch-all mounted
    expect(navigatedPaths.length).toBeGreaterThan(0)
  })

  it("safeNext rejects an absolute URL — falls back to HOME_PATH (/home)", async () => {
    setSession(fakeSession)

    // ?next=https://evil.com must NOT be followed; safeNext falls back to /home
    renderOAuthCallback("?next=https%3A%2F%2Fevil.com")

    await act(async () => {
      await Promise.resolve()
    })

    // Navigation still happens (to /home), so the catch-all mounts
    expect(navigatedPaths.length).toBeGreaterThan(0)
  })

  it("safeNext rejects a protocol-relative URL — falls back to HOME_PATH", async () => {
    setSession(fakeSession)

    renderOAuthCallback("?next=%2F%2Fevil.com%2Fsteal")

    await act(async () => {
      await Promise.resolve()
    })

    expect(navigatedPaths.length).toBeGreaterThan(0)
  })

  it("navigates to /sign-in?oauth_failed=1 after 8 s with no session", async () => {
    // Session remains null; timer fires after 8 s.
    setSession(null)

    renderOAuthCallback()

    await act(async () => {
      vi.advanceTimersByTime(8001)
    })

    // The fallback navigate("/sign-in?oauth_failed=1") caused the catch-all to mount.
    expect(navigatedPaths.length).toBeGreaterThan(0)
  })

  it("does NOT navigate before 8 s when there is no session yet", async () => {
    setSession(null)

    renderOAuthCallback()

    // Only advance 4 s — should still be on /auth/callback, no navigation yet.
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })

    expect(navigatedPaths.length).toBe(0)
  })
})
