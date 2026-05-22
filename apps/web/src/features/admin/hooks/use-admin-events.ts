import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { adminEventFacetRowSchema, eventRowSchema, parseRowsWithSentry } from "@/lib/schemas"
import { supabase } from "@/lib/supabase"
import { sanitizePostgrestLike } from "@/lib/utils"
import { enrichAdminEvents } from "./admin-events-shared"
import { UNASSIGNED_CITY_KEY } from "@/lib/group-by-city"
import { fetchAdminEventsPage } from "@/lib/db/rpc-admin-events"
import type { CityFilterValue } from "./use-city-filter"
import type { Event, EventWithDetails } from "@/lib/types"

export function useAdminEvents(
  keyword: string,
  status: Event["status"] | "all",
  cityFilter: CityFilterValue = "all"
) {
  return useQuery({
    queryKey: qk.admin.events.list(keyword, status, cityFilter),
    queryFn: async (): Promise<EventWithDetails[]> => {
      const data = await fetchAdminEventsPage({
        status: status !== "all" ? status : undefined,
        cityId: cityFilter !== "all" && cityFilter !== UNASSIGNED_CITY_KEY ? cityFilter : undefined,
        cityIsNull: cityFilter === UNASSIGNED_CITY_KEY ? true : undefined,
        keyword: sanitizePostgrestLike(keyword) || undefined,
        limit: 200,
      })

      // parseRowsWithSentry drops individual malformed rows (with a Sentry
      // report) rather than blanking the whole admin events table on drift.
      // total_count is an extra column not in eventRowSchema — silently ignored.
      const rows = parseRowsWithSentry(eventRowSchema, data, {
        area: "admin.events.list",
      })
      return enrichAdminEvents(rows as Event[])
    },
  })
}

// Re-exported from the schema module so existing call sites keep working.
export type { AdminEventFacetRow } from "@/lib/schemas"

export function useAdminEventFacets(keyword: string) {
  return useQuery({
    queryKey: qk.admin.events.facets(keyword),
    queryFn: async () => {
      let query = supabase.from("events").select("city_id, status")
      const sanitized = sanitizePostgrestLike(keyword)
      if (sanitized) {
        query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
      }
      const { data, error } = await query
      if (error) {
        throw error
      }
      return parseRowsWithSentry(adminEventFacetRowSchema, data, {
        area: "admin.events.facets",
      })
    },
  })
}

export function useUpdateAdminEventStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: Event["status"] }) => {
      const { error } = await supabase.from("events").update({ status }).eq("id", eventId)
      if (error) {
        throw error
      }
      return status
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
    },
  })
}

export function useBatchUpdateAdminEventStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventIds, status }: { eventIds: string[]; status: Event["status"] }) => {
      const { error } = await supabase.from("events").update({ status }).in("id", eventIds)
      if (error) {
        throw error
      }
      return { count: eventIds.length, status }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
    },
  })
}

export function useDeleteAdminEvents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      const { error } = await supabase.from("events").delete().in("id", eventIds)
      if (error) {
        throw error
      }
      return { count: eventIds.length }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
    },
  })
}
