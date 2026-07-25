// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from "react-router"
import { ExploreActiveFilters } from "@/features/explore/components/explore/explore-active-filters"
import { useExploreStore } from "@/features/explore/stores/explore-store"

const appMock = vi.fn()
const authMock = vi.fn()
const searchEventsMock = vi.fn((_options: unknown) => ({
  events: [],
  isLoading: false,
  isError: false,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
}))

vi.mock("@/app/stores/app-store", () => ({ useApp: () => appMock() }))
vi.mock("@/features/auth/stores/auth-store", () => ({ useAuth: () => authMock() }))
vi.mock("@/features/events/hooks/use-tags", () => ({ useTags: () => ({ data: [] }) }))
vi.mock("@/features/explore/hooks/use-search-events-enriched", () => ({
  useSearchEventsEnriched: (options: unknown) => searchEventsMock(options),
}))
vi.mock("@/features/explore/components/explore-sections", () => ({
  ExploreActiveFilters: () => null,
  ExploreCategoryGrid: () => null,
  ExploreEventsSection: () => null,
  ExploreHeader: () => null,
  ExploreNeighborhoodCta: () => null,
  ExploreSearchFilters: () => null,
  ExploreViewControls: () => null,
}))
vi.mock("@/shared/hooks/use-document-title", () => ({ useDocumentTitle: () => undefined }))

import { ExplorePage } from "./explore"

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

function renderExplorePage(entry = "/explore") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ExplorePage />
      <LocationProbe />
    </MemoryRouter>
  )
}

function renderExploreRouter(initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <>
            <ExplorePage />
            <LocationProbe />
          </>
        ),
      },
    ],
    { initialEntries }
  )

  return { router, ...render(<RouterProvider router={router} />) }
}

function currentSearchParams() {
  const location = screen.getByTestId("location").textContent ?? ""
  const [, search = ""] = location.split("?")
  return new URLSearchParams(search)
}

function localDayBounds(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const dayStart = new Date(year, month - 1, day)
  dayStart.setHours(0, 0, 0, 0)
  const nextDay = new Date(dayStart)
  nextDay.setDate(nextDay.getDate() + 1)

  return { dateFrom: dayStart.toISOString(), dateTo: nextDay.toISOString() }
}

describe("ExplorePage", () => {
  beforeEach(() => {
    useExploreStore.getState().resetFilters()
    appMock.mockReturnValue({ selectedCity: null })
    authMock.mockReturnValue({ user: null })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("uses a custom local day range before a stale date bucket", () => {
    useExploreStore.getState().setActiveDateFilter("week")
    useExploreStore.getState().setCustomDate("2026-07-26")

    renderExplorePage()

    expect(searchEventsMock.mock.calls.at(-1)?.[0]).toMatchObject({
      searchParams: localDayBounds("2026-07-26"),
    })
  })

  it("hydrates a valid custom date and clamps radius from the URL", async () => {
    renderExplorePage("/explore?date=2026-07-26&dist=100&view=map")

    await waitFor(() => {
      expect(useExploreStore.getState().customDate).toBe("2026-07-26")
      expect(useExploreStore.getState().radiusKm).toBe(50)
    })

    expect(searchEventsMock.mock.calls.at(-1)?.[0]).toMatchObject({
      searchParams: localDayBounds("2026-07-26"),
    })
  })

  it("clamps a low integer radius to five kilometers", async () => {
    renderExplorePage("/explore?dist=2")

    await waitFor(() => {
      expect(useExploreStore.getState().radiusKm).toBe(5)
    })
  })

  it("ignores invalid date and distance values", async () => {
    useExploreStore.getState().setCustomDate("2026-07-25")
    useExploreStore.getState().setRadiusKm(25)

    renderExplorePage("/explore?date=2026-02-30&dist=15.5")

    await waitFor(() => {
      expect(useExploreStore.getState().customDate).toBe("2026-07-25")
      expect(useExploreStore.getState().radiusKm).toBe(25)
    })
  })

  it("synchronizes custom date and radius changes without dropping unrelated parameters", async () => {
    renderExplorePage("/explore?view=map")

    act(() => {
      useExploreStore.getState().setCustomDate("2026-07-27")
      useExploreStore.getState().setRadiusKm(25)
    })

    await waitFor(() => {
      expect(currentSearchParams().get("date")).toBe("2026-07-27")
      expect(currentSearchParams().get("dist")).toBe("25")
    })
    expect(currentSearchParams().get("view")).toBe("map")

    act(() => {
      useExploreStore.getState().setCustomDate(null)
    })

    await waitFor(() => {
      expect(currentSearchParams().has("date")).toBe(false)
    })
    expect(currentSearchParams().get("dist")).toBe("25")
    expect(currentSearchParams().get("view")).toBe("map")
  })

  it("clears the custom-date active filter chip", () => {
    const onCustomDateChange = vi.fn()

    render(
      <ExploreActiveFilters
        customDate="2026-07-27"
        onlyFree={false}
        activeCategory={null}
        selectedTagSlugs={[]}
        tags={[]}
        onCustomDateChange={onCustomDateChange}
        onOnlyFreeChange={vi.fn()}
        onActiveCategoryChange={vi.fn()}
        onToggleTagSlug={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Clear custom date" }))

    expect(onCustomDateChange).toHaveBeenCalledWith(null)
  })

  it("replaces the URL when synchronizing filters", async () => {
    const { router } = renderExploreRouter(["/previous", "/explore?view=map"])

    act(() => {
      useExploreStore.getState().setRadiusKm(25)
    })

    await waitFor(() => {
      expect(currentSearchParams().get("dist")).toBe("25")
    })

    await router.navigate(-1)

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/previous")
    })
  })
})
