import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { City, EventSource } from "@/lib/types"

import { AdminSourcesHeader, AdminSourcesList, type SourceDraft } from "./admin-sources-sections"

function source(overrides: Partial<EventSource> = {}): EventSource {
  return {
    id: "source-1",
    name: "City Library Feed",
    url: "https://example.com/feed",
    source_type: "rss",
    extraction_mode: "deterministic_then_llm",
    processing_mode: "manual_review",
    city_id: "city-1",
    is_active: true,
    auto_approve: false,
    scrape_interval_hours: 24,
    last_scraped_at: null,
    last_status: "success",
    error_count: 0,
    notes: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    ...overrides,
  }
}

const cities: City[] = [
  {
    id: "city-1",
    name: "Chicago",
    slug: "chicago",
    state: "IL",
    country: "US",
    latitude: null,
    longitude: null,
    timezone: "America/Chicago",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
]

const draft: SourceDraft = {
  name: "New source",
  url: "https://example.com",
  source_type: "rss",
  extraction_mode: "deterministic_then_llm",
  processing_mode: "manual_review",
  city_id: "city-1",
}

describe("AdminSourcesHeader", () => {
  it("renders bulk controls and add-source trigger", () => {
    const html = renderToStaticMarkup(
      createElement(AdminSourcesHeader, {
        activeSourceCount: 1,
        cities,
        dialogOpen: false,
        newSource: draft,
        isBulkPending: false,
        isScrapeAllPending: false,
        onDialogOpenChange: vi.fn(),
        onSourceDraftPatch: vi.fn(),
        onAddSource: vi.fn(),
        onBulkSetProcessingMode: vi.fn(),
        onScrapeAll: vi.fn(),
      })
    )

    expect(html).toContain("Bulk")
    expect(html).toContain("Add Source")
  })
})

describe("AdminSourcesList", () => {
  it("renders per-source processing mode control separate from extraction mode", () => {
    const html = renderToStaticMarkup(
      createElement(AdminSourcesList, {
        sources: [source()],
        cities,
        cityFilter: "city-1",
        latestErrorBySourceId: new Map(),
        scrapingSourceIds: new Set<string>(),
        onToggleActive: vi.fn(),
        onSetProcessingMode: vi.fn(),
        onScrape: vi.fn(),
        onAddSourceForCity: vi.fn(),
      })
    )

    expect(html).toContain("Processing")
    expect(html).toContain("Extraction:")
  })
})
