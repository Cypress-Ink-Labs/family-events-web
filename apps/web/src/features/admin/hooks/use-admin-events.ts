import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { adminEventFacetRowSchema, parseRowsWithSentry } from "@/lib/schemas"
import { supabase } from "@/lib/supabase"
import { sanitizePostgrestLike } from "@/lib/utils"
import { UNASSIGNED_CITY_KEY } from "@/lib/group-by-city"
import { fetchAdminEventsPage } from "@/lib/db/rpc-admin-events"
import type { AdminEventsCursor, AdminEventsPageResult } from "@/lib/db/rpc-admin-events"
import type { CityFilterValue } from "./use-city-filter"
import type { Event } from "@/lib/types"

export interface AdminEventsInfiniteData {
  events: Event[]
  loadedCount: number
  totalCount: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

export function useAdminEventsInfinite(
  keyword: string,
  status: Event["status"] | "all",
  cityFilter: CityFilterValue = "all"
) {
  const sanitizedKeyword = sanitizePostgrestLike(keyword) || undefined
  const filters = {
    status: status !== "all" ? status : undefined,
    cityId: cityFilter !== "all" && cityFilter !== UNASSIGNED_CITY_KEY ? cityFilter : undefined,
    cityIsNull: cityFilter === UNASSIGNED_CITY_KEY ? true : undefined,
    keyword: sanitizedKeyword,
    limit: 200,
  }

  const query = useInfiniteQuery({
    queryKey: qk.admin.events.list({
      keyword: sanitizedKeyword ?? "",
      status,
      cityFilter,
      pageSize: 200,
    }),
    queryFn: ({ pageParam }) => {
      return fetchAdminEventsPage(filters, pageParam)
    },
    initialPageParam: {} as AdminEventsCursor,
    getNextPageParam: (lastPage: AdminEventsPageResult, allPages: AdminEventsPageResult[]) => {
      if (lastPage.rows.length === 0 || lastPage.totalCount <= 0) {
        return undefined
      }

      const loadedCount = allPages.reduce((count, page) => count + page.rows.length, 0)
      if (loadedCount >= lastPage.totalCount) {
        return undefined
      }

      const finalRow = lastPage.rows[lastPage.rows.length - 1]
      return {
        afterCreatedAt: finalRow.created_at,
        afterId: finalRow.id,
      }
    },
  })

  const data = query.data?.pages
    ? {
        events: query.data.pages.flatMap((page) => page.rows),
        loadedCount: query.data.pages.reduce((acc, page) => acc + page.rows.length, 0),
        totalCount:
          query.data.pages.find((page) => page.totalCount > 0)?.totalCount ??
          query.data.pages.at(-1)?.totalCount ??
          0,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
      }
    : undefined

  return { ...query, data }
}

// Re-exported from the schema module so existing call sites keep working.
export type { AdminEventFacetRow } from "@/lib/schemas"

export function useAdminEventFacets(keyword: string) {
  return useQuery({
    queryKey: qk.admin.events.facets(keyword),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_event_facets", {
        p_keyword: sanitizePostgrestLike(keyword) || undefined,
      })
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
