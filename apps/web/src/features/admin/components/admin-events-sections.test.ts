import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import type { Event } from "@/lib/types"

import { AdminEventsList, AdminEventsToolbar } from "./admin-events-sections"

vi.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: vi.fn((options: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: options.count }, (_, index) => ({
        key: index,
        index,
        start: index * options.estimateSize(),
        end: (index + 1) * options.estimateSize(),
        size: options.estimateSize(),
      })),
    getTotalSize: () => options.count * options.estimateSize(),
    measureElement: () => 0,
  })),
}))

function adminEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-base",
    title: "Story Time",
    description: null,
    start_datetime: "2026-06-01T15:00:00.000Z",
    end_datetime: null,
    timezone: "America/Chicago",
    venue_name: "Library",
    address: null,
    city_id: null,
    latitude: null,
    longitude: null,
    age_min: null,
    age_max: null,
    price: null,
    is_free: true,
    is_outdoor: null,
    source_url: null,
    source_name: null,
    source_id: null,
    images: [],
    status: "draft",
    ai_confidence: 0.88,
    ai_tag_provider: "openai",
    ai_tag_model: "gpt-4o-mini",
    ai_tag_status: "success",
    recurrence_info: null,
    is_featured: false,
    view_count: 0,
    search_vector: null,
    admin_locked_fields: [],
    admin_last_edited_at: null,
    admin_last_edited_by: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("AdminEventsToolbar", () => {
  it("renders loaded/total counts in selection control", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEventsToolbar, {
        keyword: "",
        onKeywordChange: vi.fn(),
        loadedCount: 3,
        totalCount: 10,
        allLoadedSelected: false,
        onToggleSelectAll: vi.fn(),
      })
    )

    expect(html).toContain("Select loaded (3 of 10)")
  })

  it("renders deselect copy when all loaded rows are selected", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEventsToolbar, {
        keyword: "",
        onKeywordChange: vi.fn(),
        loadedCount: 3,
        totalCount: 10,
        allLoadedSelected: true,
        onToggleSelectAll: vi.fn(),
      })
    )

    expect(html).toContain("Deselect loaded")
  })
})

describe("AdminVirtualEventsList", () => {
  it("renders an edit link and review control for an event row", () => {
    const event = adminEvent()

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(AdminEventsList, {
          events: [event],
          selectedIds: new Set<string>(),
          statusConfig: {
            draft: { label: "Draft", color: "draft" },
            published: { label: "Published", color: "published" },
            rejected: { label: "Rejected", color: "rejected" },
            archived: { label: "Archived", color: "archived" },
          },
          cities: [],
          queryState: {
            hasNextPage: false,
            isLoading: false,
            isError: false,
            isFetchingNextPage: false,
          },
          onFetchNextPage: vi.fn(),
          onRetry: vi.fn(),
          onToggleSelect: vi.fn(),
          onOpenReview: vi.fn(),
          onUpdateStatus: vi.fn(),
        })
      )
    )

    expect(html).toContain('href="/admin/events/event-base/edit"')
    expect(html).toContain("Edit event")
    expect(html).toContain("Review event")
  })

  it("renders provider model text and does not include remote image placeholders", () => {
    const event = adminEvent({ images: [] })

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(AdminEventsList, {
          events: [event],
          selectedIds: new Set<string>(),
          statusConfig: {
            draft: { label: "Draft", color: "draft" },
            published: { label: "Published", color: "published" },
            rejected: { label: "Rejected", color: "rejected" },
            archived: { label: "Archived", color: "archived" },
          },
          cities: [],
          queryState: {
            hasNextPage: false,
            isLoading: false,
            isError: false,
            isFetchingNextPage: false,
          },
          onFetchNextPage: vi.fn(),
          onRetry: vi.fn(),
          onToggleSelect: vi.fn(),
          onOpenReview: vi.fn(),
          onUpdateStatus: vi.fn(),
        })
      )
    )

    expect(html).toContain("gpt-4o-mini")
    expect(html).not.toContain("https://picsum.photos")
  })

  it("renders fetch-next loader when a next page is available", () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(AdminEventsList, {
          events: [adminEvent({ id: "event-1" })],
          selectedIds: new Set<string>(),
          statusConfig: {
            draft: { label: "Draft", color: "draft" },
            published: { label: "Published", color: "published" },
            rejected: { label: "Rejected", color: "rejected" },
            archived: { label: "Archived", color: "archived" },
          },
          cities: [],
          queryState: {
            hasNextPage: true,
            isLoading: false,
            isError: false,
            isFetchingNextPage: false,
          },
          onFetchNextPage: vi.fn(),
          onRetry: vi.fn(),
          onToggleSelect: vi.fn(),
          onOpenReview: vi.fn(),
          onUpdateStatus: vi.fn(),
        })
      )
    )

    expect(html).toContain("Load more events available.")
  })
})
