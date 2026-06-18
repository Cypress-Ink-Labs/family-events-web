// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"

const authMock = vi.fn()
const appMock = vi.fn()
const enrichedMock = vi.fn()

vi.mock("@/features/auth/stores/auth-store", () => ({ useAuth: () => authMock() }))
vi.mock("@/app/stores/app-store", () => ({ useApp: () => appMock() }))
vi.mock("@/features/events/hooks/use-enriched-events", () => ({
  useEnrichedEvents: () => enrichedMock(),
}))
vi.mock("@/features/dashboard/components/dashboard-sections", () => ({
  DashboardCarouselSection: () => <div data-testid="carousel" />,
  DashboardEmptyState: () => <div data-testid="empty" />,
  DashboardErrorState: () => <div data-testid="error" />,
  DashboardGuestCta: () => <div data-testid="guest" />,
  DashboardHeader: () => null,
  DashboardLoadingState: () => <div data-testid="loading" />,
  DashboardParentPulse: () => null,
  DashboardSavedSection: () => <div data-testid="saved" />,
  DashboardSoonSection: () => <div data-testid="soon" />,
  DashboardTodaySection: () => <div data-testid="today" />,
}))
vi.mock("@/shared/components/motion", () => ({
  FadeSwap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { DashboardPage } from "./dashboard"

const minimalEvent = {
  id: "evt-1",
  title: "Test Event",
  start_datetime: "2026-06-20T10:00:00.000Z",
  end_datetime: null,
  timezone: "America/Chicago",
  is_featured: false,
  is_favorited: false,
  venue_name: "Library",
  address: "1 Main St",
  city_id: "city-1",
  latitude: null,
  longitude: null,
  age_min: 2,
  age_max: 6,
  price: null,
  is_free: true,
  is_outdoor: null,
  source_url: "https://example.com",
  source_name: "Example",
  source_id: "src-1",
  images: [],
  status: "published",
  description: null,
  tags: [],
  ai_confidence: null,
  ai_tag_provider: null,
  ai_tag_model: null,
  ai_tag_status: null,
  submitted_by: null,
  recurrence_info: null,
  view_count: 0,
  search_vector: null,
  admin_locked_fields: [],
  admin_last_edited_at: null,
  admin_last_edited_by: null,
  last_enrichment_attempt_at: null,
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
}

beforeEach(() => {
  appMock.mockReturnValue({ selectedCity: { id: "city-1", timezone: "America/Chicago" } })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("DashboardPage", () => {
  it("renders DashboardGuestCta when user is null and events are loaded", () => {
    authMock.mockReturnValue({ user: null, profile: null })
    enrichedMock.mockReturnValue({ data: [minimalEvent], isLoading: false, isError: false })

    render(<DashboardPage />)

    expect(screen.getByTestId("guest")).toBeDefined()
    expect(screen.queryByTestId("loading")).toBeNull()
    expect(screen.queryByTestId("error")).toBeNull()
    expect(screen.queryByTestId("empty")).toBeNull()
  })

  it("renders DashboardLoadingState when user is present and events are loading", () => {
    authMock.mockReturnValue({ user: { id: "user-1" }, profile: null })
    enrichedMock.mockReturnValue({ data: [], isLoading: true, isError: false })

    render(<DashboardPage />)

    expect(screen.getByTestId("loading")).toBeDefined()
    expect(screen.queryByTestId("guest")).toBeNull()
    expect(screen.queryByTestId("error")).toBeNull()
    expect(screen.queryByTestId("empty")).toBeNull()
  })

  it("renders DashboardErrorState when events query has an error", () => {
    authMock.mockReturnValue({ user: { id: "user-1" }, profile: null })
    enrichedMock.mockReturnValue({ data: [], isLoading: false, isError: true })

    render(<DashboardPage />)

    expect(screen.getByTestId("error")).toBeDefined()
    expect(screen.queryByTestId("loading")).toBeNull()
    expect(screen.queryByTestId("guest")).toBeNull()
    expect(screen.queryByTestId("empty")).toBeNull()
  })

  it("renders DashboardEmptyState when events are loaded and empty", () => {
    authMock.mockReturnValue({ user: { id: "user-1" }, profile: null })
    enrichedMock.mockReturnValue({ data: [], isLoading: false, isError: false })

    render(<DashboardPage />)

    expect(screen.getByTestId("empty")).toBeDefined()
    expect(screen.queryByTestId("loading")).toBeNull()
    expect(screen.queryByTestId("error")).toBeNull()
    expect(screen.queryByTestId("guest")).toBeNull()
  })

  it("renders populated sections and no empty-state when events are present", () => {
    authMock.mockReturnValue({ user: { id: "user-1" }, profile: null })
    enrichedMock.mockReturnValue({ data: [minimalEvent], isLoading: false, isError: false })

    render(<DashboardPage />)

    // Populated sections should be present
    expect(screen.getByTestId("today")).toBeDefined()
    // Empty state should not appear
    expect(screen.queryByTestId("empty")).toBeNull()
    expect(screen.queryByTestId("loading")).toBeNull()
    expect(screen.queryByTestId("error")).toBeNull()
    // Guest CTA not shown when user is logged in
    expect(screen.queryByTestId("guest")).toBeNull()
  })
})
