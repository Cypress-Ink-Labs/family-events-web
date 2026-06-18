import type { EventWithDetails } from "@/shared/types"

/**
 * Merge a page of raw search results with enriched event data, preserving
 * the search-result ordering (which controls relevance/sort).
 *
 * Enrichment supplies: tags, avg_rating, rating_count, is_favorited,
 * is_in_calendar. All other fields are taken from the raw search row.
 * If an event id is missing from the enriched map (e.g. enrichment query
 * is still loading or the row failed validation), the raw search row is
 * returned as-is so nothing disappears from the list.
 *
 * @param searchEvents  - Ordered array from the search_events RPC (may have
 *                        empty enrichment fields).
 * @param enrichedById  - Map from event id to an enriched EventWithDetails,
 *                        typically built from useEnrichedEvents results.
 */
export function mergeSearchWithEnriched(
  searchEvents: EventWithDetails[],
  enrichedById: Map<string, EventWithDetails>
): EventWithDetails[] {
  return searchEvents.map((raw) => {
    const enriched = enrichedById.get(raw.id)
    if (!enriched) return raw
    return {
      ...raw,
      tags: enriched.tags,
      avg_rating: enriched.avg_rating,
      rating_count: enriched.rating_count,
      is_favorited: enriched.is_favorited,
      is_in_calendar: enriched.is_in_calendar,
    }
  })
}

/**
 * Build a Map<id, EventWithDetails> from an array of enriched events.
 * Convenience helper so callers don't repeat the reduce.
 */
export function indexEnrichedById(events: EventWithDetails[]): Map<string, EventWithDetails> {
  const map = new Map<string, EventWithDetails>()
  for (const ev of events) {
    map.set(ev.id, ev)
  }
  return map
}
