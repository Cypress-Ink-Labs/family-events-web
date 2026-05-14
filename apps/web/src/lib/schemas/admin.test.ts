import { describe, expect, it } from "vitest"
import { adminEventFacetRowSchema, eventSourceRowSchema } from "./admin"

const baseSourceRow = {
  id: "src-1",
  name: "Sample feed",
  url: "https://example.com/feed.rss",
  source_type: "rss" as const,
  city_id: null,
  is_active: true,
  auto_approve: false,
  scrape_interval_hours: 6,
  last_scraped_at: null,
  last_status: null,
  error_count: 0,
  notes: null,
  created_at: "2026-05-12T00:00:00Z",
  updated_at: "2026-05-12T00:00:00Z",
}

describe("eventSourceRowSchema", () => {
  it("accepts a valid row with null last_status (never scraped)", () => {
    const parsed = eventSourceRowSchema.parse(baseSourceRow)
    expect(parsed.id).toBe("src-1")
    expect(parsed.last_status).toBeNull()
  })

  it("accepts every documented last_status enum value", () => {
    for (const status of ["pending", "success", "error", "partial"] as const) {
      const parsed = eventSourceRowSchema.parse({ ...baseSourceRow, last_status: status })
      expect(parsed.last_status).toBe(status)
    }
  })

  it("rejects an unknown source_type", () => {
    const result = eventSourceRowSchema.safeParse({
      ...baseSourceRow,
      source_type: "spreadsheet",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an unknown last_status string", () => {
    const result = eventSourceRowSchema.safeParse({ ...baseSourceRow, last_status: "stale" })
    expect(result.success).toBe(false)
  })
})

describe("adminEventFacetRowSchema", () => {
  it("accepts a row with null city_id (unassigned)", () => {
    const parsed = adminEventFacetRowSchema.parse({ city_id: null, status: "draft" })
    expect(parsed.city_id).toBeNull()
    expect(parsed.status).toBe("draft")
  })

  it("rejects an unknown status", () => {
    const result = adminEventFacetRowSchema.safeParse({ city_id: null, status: "ghost" })
    expect(result.success).toBe(false)
  })
})
