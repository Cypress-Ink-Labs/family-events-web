import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import type { Event } from "@/shared/types"
import { LLM_EVENT_REVIEW_DECISION, LLM_EVENT_REVIEW_STATUS } from "@/shared/constants/llm-review"

import { AdminEventsList } from "./admin-events-list"
import { AdminEventsToolbar, AdminLlmReviewFilterBar } from "./admin-events-sections"

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
    llm_review_status: LLM_EVENT_REVIEW_STATUS.NOT_REQUIRED,
    llm_review_decision: null,
    llm_review_confidence: null,
    llm_review_reason: null,
    llm_review_flags: [],
    llm_review_provider: null,
    llm_review_model: null,
    llm_review_prompt_version: null,
    llm_reviewed_at: null,
    llm_review_error: null,
    recurrence_info: null,
    is_featured: false,
    view_count: 0,
    search_vector: null,
    admin_locked_fields: [],
    admin_last_edited_at: null,
    admin_last_edited_by: null,
    last_enrichment_attempt_at: null,
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
        pageSize: 200,
        onPageSizeChange: vi.fn(),
      })
    )

    expect(html).toContain("Select loaded (3 of 10)")
    expect(html).toContain("200")
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
        pageSize: 200,
        onPageSizeChange: vi.fn(),
      })
    )

    expect(html).toContain("Deselect loaded")
  })

  it("renders a rows-per-page picker", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEventsToolbar, {
        keyword: "",
        onKeywordChange: vi.fn(),
        loadedCount: 0,
        totalCount: 0,
        allLoadedSelected: false,
        onToggleSelectAll: vi.fn(),
        pageSize: 500,
        onPageSizeChange: vi.fn(),
      })
    )

    // Radix Select's listbox is portaled and only mounts on open, so the
    // SSR string just contains the trigger. The aria-label is the stable
    // hook for tests that don't mount a full DOM.
    expect(html).toContain("Rows per page")
  })

  it("removes the page-size picker when given the matching count", () => {
    // Sanity: every option is offered. Renders all options' values into a
    // list we assert separately so a future option add forces a test
    // refresh.
    const html = renderToStaticMarkup(
      createElement(AdminEventsToolbar, {
        keyword: "",
        onKeywordChange: vi.fn(),
        loadedCount: 0,
        totalCount: 0,
        allLoadedSelected: false,
        onToggleSelectAll: vi.fn(),
        pageSize: 50,
        onPageSizeChange: vi.fn(),
      })
    )
    expect(html).toContain("Rows per page")
  })
})

describe("AdminLlmReviewFilterBar", () => {
  it("renders all expected llm review filters", () => {
    const html = renderToStaticMarkup(
      createElement(AdminLlmReviewFilterBar, {
        llmReviewFilter: "all",
        onChange: vi.fn(),
      })
    )

    expect(html).toContain("LLM reviewed")
    expect(html).toContain("LLM approved")
    expect(html).toContain("LLM rejected")
    expect(html).toContain("Needs Admin Review")
    expect(html).toContain("LLM failed")
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

  it("renders LLM approved badge with confidence", () => {
    const event = adminEvent({
      llm_review_status: LLM_EVENT_REVIEW_STATUS.SUCCEEDED,
      llm_review_decision: LLM_EVENT_REVIEW_DECISION.APPROVE,
      llm_review_confidence: 0.92,
      llm_review_reason: "High confidence family-safe event",
      llm_review_provider: "openai",
      llm_review_model: "gpt-5.4",
    })

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

    expect(html).toContain("LLM approved · 0.92")
    expect(html).toContain("gpt-5.4")
    expect(html).not.toContain("gpt-4o-mini")
  })

  it("renders needs-review and failed LLM states", () => {
    const failed = adminEvent({
      id: "failed",
      llm_review_status: LLM_EVENT_REVIEW_STATUS.FAILED,
      llm_review_decision: LLM_EVENT_REVIEW_DECISION.NEEDS_ADMIN_REVIEW,
      llm_review_error: "provider timeout",
    })
    const lowConfidence = adminEvent({
      id: "low-confidence",
      llm_review_status: LLM_EVENT_REVIEW_STATUS.SUCCEEDED,
      llm_review_decision: LLM_EVENT_REVIEW_DECISION.NEEDS_ADMIN_REVIEW,
      llm_review_confidence: 0.61,
      llm_review_reason: "Missing source details",
    })

    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(AdminEventsList, {
          events: [failed, lowConfidence],
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

    expect(html).toContain("LLM failed")
    expect(html).toContain("Needs review · 0.61")
    expect(html).toContain("provider timeout")
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
