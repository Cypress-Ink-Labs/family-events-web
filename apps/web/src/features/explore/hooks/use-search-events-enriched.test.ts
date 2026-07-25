// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildEnrichedQueryKey } from "@/features/events/hooks/use-enriched-events"
import { useSearchEventsEnriched } from "./use-search-events-enriched"
import type { EventWithDetails } from "@/shared/types"

const mocks = vi.hoisted(() => ({
  searchEvents: vi.fn(),
  fetchEventsPage: vi.fn(),
}))

vi.mock("@/features/explore/lib/search-api", () => ({
  searchEvents: mocks.searchEvents,
}))

vi.mock("@/lib/db/rpc-events", () => ({
  fetchEventsPage: mocks.fetchEventsPage,
}))

const USER_ID = "user-1"
const PAGE_ONE_IDS = ["page-1-b", "page-1-a"]
const PAGE_TWO_IDS = ["page-2-b", "page-2-a"]
const SEARCH_ORDER = [...PAGE_ONE_IDS, ...PAGE_TWO_IDS]

function eventRow(id: string, title: string) {
  return {
    id,
    title,
    description: null,
    start_datetime: "2026-06-01T10:00:00Z",
    end_datetime: null,
    timezone: "America/Chicago",
    venue_name: null,
    address: null,
    city_id: null,
    latitude: null,
    longitude: null,
    age_min: null,
    age_max: null,
    price: null,
    is_free: true,
    source_url: null,
    source_name: null,
    source_id: null,
    images: [],
    status: "published" as const,
    ai_confidence: null,
    ai_tag_provider: null,
    recurrence_info: null,
    is_featured: false,
    view_count: 0,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  }
}

function searchEvent(id: string): EventWithDetails {
  return {
    ...eventRow(id, `Search ${id}`),
    tags: [],
    avg_rating: 0,
    rating_count: 0,
    is_favorited: false,
    is_in_calendar: false,
  } as unknown as EventWithDetails
}

function enrichedEvent(id: string): EventWithDetails {
  const rating = Number(id.at(-1) === "a" ? "4" : "5")

  return {
    ...eventRow(id, `Enriched ${id}`),
    tags: [{ id: "tag-1", name: "Music", slug: "music", color: "#ff0" }],
    avg_rating: rating,
    rating_count: rating * 10,
    is_favorited: id.endsWith("a"),
    is_in_calendar: id.endsWith("b"),
    image_attributions: [],
  } as unknown as EventWithDetails
}

const pageOne = {
  events: PAGE_ONE_IDS.map(searchEvent),
  nextCursor: { afterStartDatetime: "2026-06-01T10:00:00Z", afterId: "page-1-a" },
}

const pageTwo = {
  events: PAGE_TWO_IDS.map(searchEvent),
  nextCursor: null,
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

function renderSearchHook() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const hook = renderHook(
    () =>
      useSearchEventsEnriched({
        searchParams: { keyword: "music", limit: 2 },
        userId: USER_ID,
      }),
    { wrapper: wrapper(client) }
  )

  return { client, ...hook }
}

async function loadTwoSearchPages() {
  const rendered = renderSearchHook()

  await waitFor(() => {
    expect(rendered.result.current.events.map((event) => event.id)).toEqual(PAGE_ONE_IDS)
    expect(mocks.fetchEventsPage).toHaveBeenCalledTimes(1)
  })

  act(() => {
    rendered.result.current.fetchNextPage()
  })

  await waitFor(() => {
    expect(rendered.result.current.events.map((event) => event.id)).toEqual(SEARCH_ORDER)
    expect(mocks.fetchEventsPage).toHaveBeenCalledTimes(2)
  })

  return rendered
}

beforeEach(() => {
  mocks.searchEvents.mockReset()
  mocks.fetchEventsPage.mockReset()

  mocks.searchEvents.mockImplementation(async ({ afterId }: { afterId?: string }) =>
    afterId ? pageTwo : pageOne
  )
  mocks.fetchEventsPage.mockImplementation(async ({ eventIds }: { eventIds?: string[] }) =>
    (eventIds ?? []).map(enrichedEvent)
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("useSearchEventsEnriched", () => {
  it("enriches only the newly loaded page and preserves search ordering", async () => {
    const { result } = await loadTwoSearchPages()

    expect(mocks.fetchEventsPage.mock.calls.map(([filters]) => filters.eventIds)).toEqual([
      PAGE_ONE_IDS,
      PAGE_TWO_IDS,
    ])
    expect(result.current.events.map((event) => event.title)).toEqual(
      SEARCH_ORDER.map((id) => `Search ${id}`)
    )
    expect(result.current.events.map((event) => event.avg_rating)).toEqual([5, 4, 5, 4])
    expect(result.current.events.map((event) => event.is_favorited)).toEqual([
      false,
      true,
      false,
      true,
    ])
  })

  it("refetches each page query when the enrichment prefix is invalidated", async () => {
    const { client } = await loadTwoSearchPages()

    expect(
      client
        .getQueryCache()
        .findAll({ queryKey: ["events-enriched"] })
        .map((query) => query.queryKey)
    ).toEqual([
      buildEnrichedQueryKey({ eventIds: PAGE_ONE_IDS, userId: USER_ID }),
      buildEnrichedQueryKey({ eventIds: PAGE_TWO_IDS, userId: USER_ID }),
    ])

    await act(async () => {
      await client.invalidateQueries({ queryKey: ["events-enriched"] })
    })

    await waitFor(() => expect(mocks.fetchEventsPage).toHaveBeenCalledTimes(4))
    expect(mocks.fetchEventsPage.mock.calls.slice(-2).map(([filters]) => filters.eventIds)).toEqual(
      [PAGE_ONE_IDS, PAGE_TWO_IDS]
    )
  })
})
