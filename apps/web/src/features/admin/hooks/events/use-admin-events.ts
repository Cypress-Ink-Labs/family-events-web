import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { sanitizePostgrestLike } from "@/shared/utils/format"
import { UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import { fetchAdminEventsPage } from "@/lib/db/rpc-admin-events"
import type { AdminEventsCursor, AdminEventsPageResult } from "@/lib/db/rpc-admin-events"
import type { Event } from "@/shared/types"
import {
  batchUpdateAdminEventStatus,
  deleteAdminEvents,
  fetchAdminEventFacets,
  updateAdminEventStatus,
} from "@/features/admin/api/events"

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
    queryFn: () => fetchAdminEventFacets(keyword),
  })
}

export function useUpdateAdminEventStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      status,
      reason,
    }: {
      eventId: string
      status: Event["status"]
      reason?: string | null
    }) => updateAdminEventStatus(eventId, status, reason ?? null),
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
    mutationFn: ({ eventIds, status }: { eventIds: string[]; status: Event["status"] }) =>
      batchUpdateAdminEventStatus(eventIds, status),
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
    mutationFn: (eventIds: string[]) => deleteAdminEvents(eventIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
    },
  })
}
