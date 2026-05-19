import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import type { EventWithDetails } from "@/lib/types"

import { AdminEventsList, AdminEventsToolbar } from "./admin-events-sections"

describe("AdminEventsToolbar", () => {
  it("renders a single button for the select-all visible control", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEventsToolbar, {
        keyword: "",
        onKeywordChange: vi.fn(),
        eventCount: 3,
        allVisibleSelected: false,
        onToggleSelectAll: vi.fn(),
      })
    )

    expect((html.match(/<button\b/g) ?? []).length).toBe(1)
    expect(html).toContain("Select all visible (3)")
  })
})

describe("AdminEventsList", () => {
  it("renders an edit link for each admin event card", () => {
    const event: EventWithDetails = {
      id: "event-1",
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
      ai_confidence: null,
      ai_tag_provider: null,
      ai_tag_model: null,
      recurrence_info: null,
      is_featured: false,
      view_count: 0,
      search_vector: null,
      admin_locked_fields: [],
      admin_last_edited_at: null,
      admin_last_edited_by: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    }

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
          cityFilter: "none",
          onToggleSelect: vi.fn(),
          onOpenReview: vi.fn(),
          onUpdateStatus: vi.fn(),
        })
      )
    )

    expect(html).toContain('href="/admin/events/event-1/edit"')
    expect(html).toContain("Edit event")
  })

  it("renders ai_tag_model label when ai_tag_model is non-null", () => {
    const event: EventWithDetails = {
      id: "event-2",
      title: "Music Night",
      description: null,
      start_datetime: "2026-06-01T19:00:00.000Z",
      end_datetime: null,
      timezone: "America/Chicago",
      venue_name: "Venue",
      address: null,
      city_id: null,
      latitude: null,
      longitude: null,
      age_min: null,
      age_max: null,
      price: null,
      is_free: false,
      is_outdoor: null,
      source_url: null,
      source_name: null,
      source_id: null,
      images: [],
      status: "draft",
      ai_confidence: 0.9,
      ai_tag_provider: "openai",
      ai_tag_model: "gpt-4o-mini",
      recurrence_info: null,
      is_featured: false,
      view_count: 0,
      search_vector: null,
      admin_locked_fields: [],
      admin_last_edited_at: null,
      admin_last_edited_by: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    }

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
          cityFilter: "none",
          onToggleSelect: vi.fn(),
          onOpenReview: vi.fn(),
          onUpdateStatus: vi.fn(),
        })
      )
    )

    expect(html).toContain("gpt-4o-mini")
  })

  it("does not render a model label when ai_tag_model is null", () => {
    const event: EventWithDetails = {
      id: "event-3",
      title: "Art Fair",
      description: null,
      start_datetime: "2026-06-02T10:00:00.000Z",
      end_datetime: null,
      timezone: "America/Chicago",
      venue_name: "Gallery",
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
      status: "published",
      ai_confidence: 0.8,
      ai_tag_provider: "openai",
      ai_tag_model: null,
      recurrence_info: null,
      is_featured: false,
      view_count: 0,
      search_vector: null,
      admin_locked_fields: [],
      admin_last_edited_at: null,
      admin_last_edited_by: null,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z",
    }

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
          cityFilter: "none",
          onToggleSelect: vi.fn(),
          onOpenReview: vi.fn(),
          onUpdateStatus: vi.fn(),
        })
      )
    )

    // The model span should not appear when ai_tag_model is null
    expect(html).not.toContain("· null")
  })
})
