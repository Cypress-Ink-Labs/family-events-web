// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"

const appMock = vi.fn()
const authMock = vi.fn()
const planMock = vi.fn((_options: unknown) => ({
  data: {
    date: "2026-07-26",
    dayOffset: 0,
    weatherFit: "rain",
    weather: null,
    events: [],
    heroEvent: null,
    secondaryEvents: [],
    fallbackMessage: null,
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  isRefetching: false,
}))

vi.mock("@/app/stores/app-store", () => ({ useApp: () => appMock() }))
vi.mock("@/features/auth/stores/auth-store", () => ({ useAuth: () => authMock() }))
vi.mock("@/features/plan/hooks/use-plan-for-today", () => ({
  usePlanForToday: (options: unknown) => planMock(options),
}))
vi.mock("@/features/plan/components/plan-hero-card", () => ({ PlanHeroCard: () => null }))
vi.mock("@/features/plan/components/plan-thumb-card", () => ({ PlanThumbCard: () => null }))
vi.mock("@/features/plan/components/weather-strip", () => ({ WeatherStrip: () => null }))
vi.mock("@/shared/components/motion", () => ({
  FadeSwap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StaggerItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StaggerList: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock("@/shared/hooks/use-document-title", () => ({ useDocumentTitle: () => undefined }))

import { SaturdayPlanPage } from "./saturday-plan"

describe("SaturdayPlanPage Explore handoff", () => {
  beforeEach(() => {
    appMock.mockReturnValue({ selectedCity: null })
    authMock.mockReturnValue({ user: null, profile: null })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("links to Explore with executable date and distance filters only", () => {
    render(
      <MemoryRouter>
        <SaturdayPlanPage />
      </MemoryRouter>
    )

    const href = screen.getByRole("link", { name: /see more options/i }).getAttribute("href")
    expect(href).toBe("/explore?date=2026-07-26&dist=15")
    expect(new URL(href!, "https://example.test").searchParams.has("fit")).toBe(false)
  })
})
