// @vitest-environment jsdom

import { fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { qk } from "@/infrastructure/queries/query-keys"
import { AdminSourcesPage } from "./admin-sources"

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
  triggerSourceScrape: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}))

vi.mock("@/features/admin/api/sources", () => ({
  triggerSourceScrape: mocks.triggerSourceScrape,
}))

vi.mock("@/features/admin/components/admin-sources-sections", () => ({
  AdminSourcesHeader: ({ onScrapeAll }: { onScrapeAll: () => void }) => (
    <button onClick={onScrapeAll}>Scrape All</button>
  ),
  AdminSourcesList: () => null,
}))

vi.mock("@/features/admin/hooks/sources/use-admin-sources", () => ({
  useAdminBulkSetProcessingMode: () => ({ mutateAsync: vi.fn() }),
  useAdminSources: () => ({
    data: Array.from({ length: 10 }, (_, index) => ({
      id: `source-${index}`,
      is_active: true,
    })),
  }),
  useCreateAdminSource: () => ({ mutateAsync: vi.fn() }),
  useTriggerSourceScrape: () => ({ mutateAsync: vi.fn() }),
  useUpdateAdminSource: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("@/features/admin/hooks/sources/use-admin-source-runs", () => ({
  useAdminSourceRunErrors: () => ({ data: [] }),
}))

vi.mock("@/features/admin/hooks/use-admin-cities", () => ({
  useAdminCities: () => ({ data: [] }),
}))

vi.mock("@/features/admin/hooks/use-city-filter", () => ({
  useCityFilter: () => ({ setValue: vi.fn(), value: "all" }),
}))

vi.mock("@/features/admin/hooks/use-admin-toast", () => ({
  useAdminToast: () => ({ toastError: vi.fn() }),
}))

vi.mock("@/features/admin/stores/admin-store", () => ({
  useAdminStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      addScrapingId: vi.fn(),
      removeScrapingId: vi.fn(),
      scrapingSourceIds: new Set<string>(),
    }),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

afterEach(() => {
  mocks.invalidateQueries.mockClear()
  mocks.triggerSourceScrape.mockReset()
})

describe("AdminSourcesPage Scrape All", () => {
  it("limits ten direct scrapes to four in flight and invalidates each cache family once", async () => {
    const scrapes = new Map(
      Array.from({ length: 10 }, (_, index) => [`source-${index}`, deferred()])
    )
    let inFlight = 0
    let maxInFlight = 0

    mocks.triggerSourceScrape.mockImplementation((sourceId: string) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      const scrape = scrapes.get(sourceId)
      if (!scrape) {
        throw new Error(`Unexpected source ${sourceId}`)
      }

      return scrape.promise.finally(() => {
        inFlight -= 1
      })
    })

    const { getByRole } = render(<AdminSourcesPage />)
    fireEvent.click(getByRole("button", { name: "Scrape All" }))

    await waitFor(() => expect(mocks.triggerSourceScrape).toHaveBeenCalledTimes(4))
    expect(maxInFlight).toBe(4)

    for (const scrape of scrapes.values()) {
      scrape.resolve()
      await Promise.resolve()
    }

    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledTimes(4))
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.sources })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.sourceQueueSummary })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.sourceRuns })
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.stats })
    expect(maxInFlight).toBe(4)
  })
})
