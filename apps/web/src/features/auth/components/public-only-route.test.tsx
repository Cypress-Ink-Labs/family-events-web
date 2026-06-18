// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import type { User } from "@supabase/supabase-js"
import { PublicOnlyRoute } from "./public-only-route"

// Mock auth store — tests control the returned slice via makeAuth below.
vi.mock("@/features/auth/stores/auth-store", () => ({
  useAuth: vi.fn(),
}))

// FadeSwap uses motion/react AnimatePresence; replace with a transparent
// wrapper so renders are synchronous in tests.
vi.mock("@/shared/components/motion", () => ({
  FadeSwap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { useAuth } from "@/features/auth/stores/auth-store"

const mockedUseAuth = vi.mocked(useAuth)

type AuthSlice = ReturnType<typeof useAuth>

function makeAuth(overrides: Partial<AuthSlice> = {}): AuthSlice {
  return {
    session: null,
    user: null,
    profile: null,
    access: null,
    authError: null,
    isAdmin: false,
    isEnabled: false,
    isLoading: false,
    clearAuthError: vi.fn(),
    signIn: vi.fn(),
    signInWithProvider: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    sendMagicLink: vi.fn(),
    ...overrides,
  }
}

const fakeUser = { id: "user-1" } as User

interface RenderOptions {
  initialPath?: string
  locationState?: unknown
}

function renderPublicOnlyRoute({ initialPath = "/sign-in", locationState }: RenderOptions = {}) {
  const entry =
    locationState !== undefined ? { pathname: initialPath, state: locationState } : initialPath

  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/sign-in" element={<div data-testid="sign-in-page">Sign In</div>} />
          <Route path="/sign-up" element={<div data-testid="sign-up-page">Sign Up</div>} />
        </Route>
        {/* authed landing page that authenticated users are redirected to */}
        <Route path="/home" element={<div data-testid="home-page">Home</div>} />
        <Route path="/events/event-1" element={<div data-testid="event-page">Event</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("PublicOnlyRoute", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows a spinner while auth is loading", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ isLoading: true }))

    const { container } = renderPublicOnlyRoute()

    expect(container.querySelector(".animate-spin")).not.toBeNull()
    expect(screen.queryByTestId("sign-in-page")).toBeNull()
    expect(screen.queryByTestId("home-page")).toBeNull()
  })

  it("renders the public outlet when no user is authenticated", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, isEnabled: false, isLoading: false }))

    renderPublicOnlyRoute()

    expect(screen.getByTestId("sign-in-page")).toBeInTheDocument()
    expect(screen.queryByTestId("home-page")).toBeNull()
  })

  it("renders the public outlet when user exists but is not enabled", () => {
    // A user who exists but doesn't have access enabled should still see public pages
    // (e.g. waiting for invite approval).
    mockedUseAuth.mockReturnValue(makeAuth({ user: fakeUser, isEnabled: false, isLoading: false }))

    renderPublicOnlyRoute()

    expect(screen.getByTestId("sign-in-page")).toBeInTheDocument()
    expect(screen.queryByTestId("home-page")).toBeNull()
  })

  it("redirects an authenticated+enabled user to HOME_PATH by default", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: fakeUser, isEnabled: true, isLoading: false }))

    renderPublicOnlyRoute({ initialPath: "/sign-in" })

    // resolveInAppRedirectTarget with no from → /home
    expect(screen.getByTestId("home-page")).toBeInTheDocument()
    expect(screen.queryByTestId("sign-in-page")).toBeNull()
  })

  it("redirects an authenticated+enabled user to the safe from path in location state", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: fakeUser, isEnabled: true, isLoading: false }))

    // Set location.state.from to an in-app path
    renderPublicOnlyRoute({
      initialPath: "/sign-in",
      locationState: { from: "/events/event-1" },
    })

    expect(screen.getByTestId("event-page")).toBeInTheDocument()
    expect(screen.queryByTestId("sign-in-page")).toBeNull()
  })

  it("falls back to HOME_PATH when location.state.from is an external URL", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: fakeUser, isEnabled: true, isLoading: false }))

    // resolveInAppRedirectTarget rejects https:// URLs and falls back to /home
    renderPublicOnlyRoute({
      initialPath: "/sign-in",
      locationState: { from: "https://evil.example.com" },
    })

    expect(screen.getByTestId("home-page")).toBeInTheDocument()
    expect(screen.queryByTestId("sign-in-page")).toBeNull()
  })

  it("falls back to HOME_PATH when location.state.from is a protocol-relative URL", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: fakeUser, isEnabled: true, isLoading: false }))

    // resolveInAppRedirectTarget rejects //host paths
    renderPublicOnlyRoute({
      initialPath: "/sign-in",
      locationState: { from: "//evil.example.com/steal" },
    })

    expect(screen.getByTestId("home-page")).toBeInTheDocument()
    expect(screen.queryByTestId("sign-in-page")).toBeNull()
  })
})
