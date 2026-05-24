import { supabase } from "@/infrastructure/supabase/client"
import type { Database } from "@/lib/db"

const EVENTS_RPC = {
  enrichedPage: "events_enriched_v2",
  searchPage: "search_events_v2",
} as const

const DEFAULT_EVENT_STATUS = "published"
const DEFAULT_SEARCH_LIMIT = 100
const DEFAULT_SEARCH_OFFSET = 0

type EventsEnrichedArgs = Database["public"]["Functions"]["events_enriched_v2"]["Args"]
type SearchEventsArgs = Database["public"]["Functions"]["search_events_v2"]["Args"]

export interface EventsCursor {
  afterStartDatetime?: string
  afterId?: string
}

export interface EventsPageFilters {
  cityId?: string
  status?: string
  userId?: string
  eventIds?: string[]
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export interface SearchEventsFilters {
  cityId?: string
  dateFrom?: string
  dateTo?: string
  ageMin?: number
  ageMax?: number
  isFree?: boolean
  isFeatured?: boolean
  tagSlugs?: string[]
  keyword?: string
  status?: string
  limit?: number
  offset?: number
}

export async function fetchEventsPage(filters: EventsPageFilters, cursor?: EventsCursor) {
  const args: EventsEnrichedArgs = {
    p_city_id: filters.cityId,
    p_status: filters.status ?? DEFAULT_EVENT_STATUS,
    p_user_id: filters.userId,
    p_event_ids: filters.eventIds,
    p_date_from: filters.dateFrom,
    p_date_to: filters.dateTo,
    p_after_start_datetime: cursor?.afterStartDatetime,
    p_after_id: cursor?.afterId,
    p_limit: filters.limit ?? 24,
  }
  const { data, error } = await supabase.rpc(EVENTS_RPC.enrichedPage, args)
  if (error) throw error
  return data ?? []
}

async function searchEventsPage(filters: SearchEventsFilters, cursor?: EventsCursor) {
  const args: SearchEventsArgs = {
    p_city_id: filters.cityId,
    p_date_from: filters.dateFrom,
    p_date_to: filters.dateTo,
    p_age_min: filters.ageMin,
    p_age_max: filters.ageMax,
    p_is_free: filters.isFree,
    p_is_featured: filters.isFeatured,
    p_tag_slugs: filters.tagSlugs && filters.tagSlugs.length > 0 ? filters.tagSlugs : undefined,
    p_keyword: filters.keyword,
    p_status: filters.status ?? DEFAULT_EVENT_STATUS,
    p_limit: filters.limit ?? DEFAULT_SEARCH_LIMIT,
    p_offset: filters.offset ?? DEFAULT_SEARCH_OFFSET,
    p_after_start_datetime: cursor?.afterStartDatetime,
    p_after_id: cursor?.afterId,
  }
  const { data, error } = await supabase.rpc(EVENTS_RPC.searchPage, args)
  if (error) throw error
  return data ?? []
}
