import { z } from "zod"
import { eventRowSchema } from "./event"

// event_sources row. Mirrors src/lib/types.ts's EventSource. The status enum
// is a runtime convention (the column is plain text in the DB); accept null
// for sources that have never run.
export const eventSourceRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  source_type: z.enum(["website", "ical", "rss", "manual", "macaronikid"]),
  extraction_mode: z.enum(["deterministic", "llm", "deterministic_then_llm"]),
  city_id: z.string().nullable(),
  is_active: z.boolean(),
  auto_approve: z.boolean(),
  scrape_interval_hours: z.number(),
  last_scraped_at: z.string().nullable(),
  last_status: z.enum(["pending", "success", "error", "partial"]).nullable(),
  error_count: z.number(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type EventSourceRow = z.infer<typeof eventSourceRowSchema>

// Trimmed-projection row used by the admin facets query — only the columns
// the dashboard needs to render the city/status filter bar counts.
export const adminEventFacetRowSchema = z.object({
  city_id: z.string().nullable(),
  status: z.enum(["draft", "published", "rejected", "archived"]),
})

export type AdminEventFacetRow = z.infer<typeof adminEventFacetRowSchema>

// Re-export eventRowSchema so admin hooks that want the full event row can
// import the entire admin namespace from one place.
export { eventRowSchema }
