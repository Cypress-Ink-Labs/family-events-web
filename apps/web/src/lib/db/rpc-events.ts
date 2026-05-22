import { supabase } from "@/lib/supabase"

// TODO: Replace `as any` with generated Database types after `pnpm db:types`

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

export async function fetchEventsPage(
  filters: EventsPageFilters,
  cursor?: EventsCursor,
  limit = 24
) {
  const { data, error } = await (supabase.rpc as any)("events_enriched_v2", {
    p_city_id: filters.cityId,
    p_status: filters.status ?? "published",
    p_user_id: filters.userId,
    p_event_ids: filters.eventIds,
    p_date_from: filters.dateFrom,
    p_date_to: filters.dateTo,
    p_after_start_datetime: cursor?.afterStartDatetime,
    p_after_id: cursor?.afterId,
    p_limit: limit,
  })
  if (error) throw error
  return data ?? []
}

export async function searchEventsPage(filters: SearchEventsFilters, cursor?: EventsCursor) {
  const { data, error } = await (supabase.rpc as any)("search_events_v2", {
    p_city_id: filters.cityId,
    p_date_from: filters.dateFrom,
    p_date_to: filters.dateTo,
    p_age_min: filters.ageMin,
    p_age_max: filters.ageMax,
    p_is_free: filters.isFree,
    p_is_featured: filters.isFeatured,
    p_tag_slugs: filters.tagSlugs && filters.tagSlugs.length > 0 ? filters.tagSlugs : undefined,
    p_keyword: filters.keyword,
    p_status: filters.status ?? "published",
    p_limit: filters.limit ?? 100,
    p_offset: filters.offset ?? 0,
    p_after_start_datetime: cursor?.afterStartDatetime,
    p_after_id: cursor?.afterId,
  })
  if (error) throw error
  return data ?? []
}
