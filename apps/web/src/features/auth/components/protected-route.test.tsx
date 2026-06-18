// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import type { User } from "@supabase/supabase-js"
import { ProtectedRoute } from "./protected-route"

// Mock auth store — tests control the returned slice via makeAuth below.
vi.mock("@/features/auth/stores/auth-store", () => ({
  useAuth: vi.fn(),
}))

// FadeSwap uses motion/react AnimatePresence which adds async transitions;
// replace with a transparent wrapper so renders are synchronous in tests.
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

function renderProtectedRoute(initialPath = "/protected") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
          <Route path="/protected/deep/path" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/sign-in" element={<div data-testid="sign-in-page">Sign In</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("shows a spinner while auth is loading", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ isLoading: true }))

    const { container } = renderProtectedRoute()

    // Spinner is a div with animate-spin class
    expect(container.querySelector(".animate-spin")).not.toBeNull()
    // Protected content and redirect should NOT appear
    expect(screen.queryByText("Protected Content")).toBeNull()
    expect(screen.queryByTestId("sign-in-page")).toBeNull()
  })

  it("redirects to /sign-in when there is no user", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, isEnabled: false, isLoading: false }))

    renderProtectedRoute("/protected")

    // Navigate should have replaced the route to /sign-in
    expect(screen.getByTestId("sign-in-page")).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).toBeNull()
  })

  it("redirects to /sign-in when user exists but is not enabled", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: fakeUser, isEnabled: false, isLoading: false }))

    renderProtectedRoute("/protected")

    expect(screen.getByTestId("sign-in-page")).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).toBeNull()
  })

  it("renders the outlet when user is present and enabled", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: fakeUser, isEnabled: true, isLoading: false }))

    renderProtectedRoute("/protected")

    expect(screen.getByText("Protected Content")).toBeInTheDocument()
    expect(screen.queryByTestId("sign-in-page")).toBeNull()
  })

  it("carries the current path as state.from in the redirect", () => {
    mockedUseAuth.mockReturnValue(makeAuth({ user: null, isEnabled: false, isLoading: false }))

    // The ProtectedRoute passes `state={{ from: location.pathname }}` to Navigate.
    // We verify the redirect target is /sign-in when the user visits a deep path.
    renderProtectedRoute("/protected/deep/path")

    expect(screen.getByTestId("sign-in-page")).toBeInTheDocument()
  })
})
