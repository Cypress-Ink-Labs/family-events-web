import { supabase } from "@/infrastructure/supabase/client"
import type { EventWithDetails } from "@/shared/types"

export interface SearchEventsParams {
  keyword?: string
  cityId?: string
  dateFrom?: string
  dateTo?: string
  ageMin?: number
  ageMax?: number
  isFree?: boolean
  tagSlugs?: string[]
  lat?: number
  lng?: number
  radiusKm?: number
  limit?: number
  /** Cursor: start_datetime of last event on previous page */
  afterStartDatetime?: string
  /** Cursor: id of last event on previous page */
  afterId?: string
}

export interface SearchEventsPage {
  events: EventWithDetails[]
  /** Cursor for next page, null when no more pages */
  nextCursor: { afterStartDatetime: string; afterId: string } | null
}

const DEFAULT_PAGE_SIZE = 24

/**
 * Calls the search_events RPC with server-side FTS, filtering, and cursor pagination.
 * Returns a page of events plus the cursor for the next page.
 */
export async function searchEvents(params: SearchEventsParams): Promise<SearchEventsPage> {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE

  const { data, error } = await supabase.rpc("search_events", {
    p_keyword: params.keyword || undefined,
    p_city_id: params.cityId || undefined,
    p_date_from: params.dateFrom || undefined,
    p_date_to: params.dateTo || undefined,
    p_age_min: params.ageMin ?? undefined,
    p_age_max: params.ageMax ?? undefined,
    p_is_free: params.isFree ?? undefined,
    p_tag_slugs: params.tagSlugs?.length ? params.tagSlugs : undefined,
    p_lat: params.lat ?? undefined,
    p_lng: params.lng ?? undefined,
    p_radius_km: params.radiusKm ?? undefined,
    p_limit: limit,
    p_after_start_datetime: params.afterStartDatetime || undefined,
    p_after_id: params.afterId || undefined,
  })

  if (error) throw error

  const rows = (data ?? []) as unknown[]

  // search_events returns raw event rows, not enriched rows.
  // Map them to EventWithDetails-compatible shape with empty enrichment fields.
  const events: EventWithDetails[] = rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      ...(r as unknown as EventWithDetails),
      tags: [],
      avg_rating: 0,
      rating_count: 0,
      is_favorited: false,
      is_in_calendar: false,
    }
  })

  // Determine next cursor: if we got exactly `limit` results, there may be more
  const hasMore = events.length === limit
  const lastEvent = events.at(-1)
  const nextCursor =
    hasMore && lastEvent
      ? {
          afterStartDatetime: lastEvent.start_datetime,
          afterId: lastEvent.id,
        }
      : null

  return { events, nextCursor }
}
