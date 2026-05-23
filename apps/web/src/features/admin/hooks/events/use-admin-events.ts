import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { adminEventFacetRowSchema, parseRowsWithSentry } from "@/lib/schemas"
import { supabase } from "@/lib/supabase/client"
import { sanitizePostgrestLike } from "@/lib/utils"
import { UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import { fetchAdminEventsPage } from "@/lib/db/rpc-admin-events"
import type { AdminEventsCursor, AdminEventsPageResult } from "@/lib/db/rpc-admin-events"
import type { Event } from "@/lib/types"

export interface AdminEventsInfiniteData {
  events: Event[]
  loadedCount: number
  totalCount: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
}

export type AdminLlmReviewFilter =
  | "all"
  | "reviewed"
  | "approved"
  | "rejected"
  | "needs_admin_review"
  | "failed"

interface AdminEventsInfiniteOptions {
  keyword: string
  status: Event["status"] | "all"
  cityFilter?: CityFilterValue
  llmReviewFilter?: AdminLlmReviewFilter
  pageSize?: number
}

export function useAdminEventsInfinite({
  keyword,
  status,
  cityFilter = "all",
  llmReviewFilter = "all",
  pageSize = 200,
}: AdminEventsInfiniteOptions) {
  const sanitizedKeyword = sanitizePostgrestLike(keyword) || undefined
  const llmReviewStatus =
    llmReviewFilter === "failed"
      ? "failed"
      : llmReviewFilter === "reviewed"
        ? "succeeded"
        : undefined
  const llmReviewDecision =
    llmReviewFilter === "approved"
      ? "approve"
      : llmReviewFilter === "rejected"
        ? "reject"
        : llmReviewFilter === "needs_admin_review"
          ? "needs_admin_review"
          : undefined
  const filters = {
    status: status !== "all" ? status : undefined,
    cityId: cityFilter !== "all" && cityFilter !== UNASSIGNED_CITY_KEY ? cityFilter : undefined,
    cityIsNull: cityFilter === UNASSIGNED_CITY_KEY ? true : undefined,
    keyword: sanitizedKeyword,
    llmReviewStatus: llmReviewStatus as Event["llm_review_status"] | undefined,
    llmReviewDecision: llmReviewDecision as Event["llm_review_decision"] | undefined,
    limit: pageSize,
  }

  const query = useInfiniteQuery({
    queryKey: qk.admin.events.list({
      keyword: sanitizedKeyword ?? "",
      status,
      cityFilter,
      llmReviewFilter,
      pageSize,
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
    mutationFn: async ({
      eventId,
      status,
      reason,
    }: {
      eventId: string
      status: Event["status"]
      reason?: string | null
    }) => {
      const { error } = await supabase.rpc("admin_update_event_status", {
        p_event_id: eventId,
        p_status: status,
        p_reason: reason ?? null,
      })
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
      const { data, error } = await supabase.rpc("admin_batch_set_event_status", {
        p_event_ids: eventIds,
        p_status: status,
      })
      if (error) {
        throw error
      }
      return { count: data ?? 0, status }
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
      const { data, error } = await supabase.rpc("admin_delete_events", {
        p_event_ids: eventIds,
      })
      if (error) {
        throw error
      }
      return { count: data ?? 0 }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
    },
  })
}
