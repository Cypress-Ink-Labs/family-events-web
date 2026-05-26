import { supabase } from "@/infrastructure/supabase/client"
import type { Database } from "@/lib/db"

const EVENTS_RPC = {
  enrichedPage: "events_enriched",
} as const

const DEFAULT_EVENT_STATUS = "published"

type EventsEnrichedArgs = Database["public"]["Functions"]["events_enriched"]["Args"]

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
