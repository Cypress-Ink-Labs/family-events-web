import { useMemo } from "react"
import { useInfiniteQuery, useQueries } from "@tanstack/react-query"
import {
  buildEnrichedQueryKey,
  fetchEnrichedEvents,
} from "@/features/events/hooks/use-enriched-events"
import { searchEvents } from "@/features/explore/lib/search-api"
import {
  indexEnrichedById,
  mergeSearchWithEnriched,
} from "@/features/explore/lib/merge-search-enriched"
import type { SearchEventsParams } from "@/features/explore/lib/search-api"
import type { EventWithDetails } from "@/shared/types"

interface UseSearchEventsEnrichedOptions {
  searchParams: SearchEventsParams
  userId?: string
}

interface UseSearchEventsEnrichedResult {
  /** Merged and ordered events: search order preserved, enrichment fields filled */
  events: EventWithDetails[]
  isLoading: boolean
  isError: boolean
  /** True while enrichment is fetching (search results already available) */
  isEnriching: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}

/**
 * Composes search_events (filtered/sorted/paginated id ordering) with
 * events_enriched (tags, ratings, favorite state) via one batched enrichment
 * query per loaded search page of ids.
 *
 * Enrichment is BATCHED per page: each events_enriched call covers the ids
 * from one loaded search page — never one call per event. Its stable by-ids
 * query key keeps earlier page data cached when more results load.
 */
export function useSearchEventsEnriched({
  searchParams,
  userId,
}: UseSearchEventsEnrichedOptions): UseSearchEventsEnrichedResult {
  // --- Search query (paginated) ---
  const {
    data: infiniteData,
    isLoading: isSearchLoading,
    isError: isSearchError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["search-events", searchParams],
    queryFn: ({ pageParam }) =>
      searchEvents({
        ...searchParams,
        afterStartDatetime: pageParam?.afterStartDatetime,
        afterId: pageParam?.afterId,
      }),
    initialPageParam: null as { afterStartDatetime: string; afterId: string } | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  // Flatten search results across all loaded pages, preserving order
  const allSearchEvents = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.events) ?? [],
    [infiniteData]
  )

  // --- Enrichment queries (one batch per loaded search page) ---
  // Each page keeps its own stable by-ids key, so loading another page does not
  // refetch enrichment for pages already in cache.
  const enrichmentQueries = useQueries({
    queries: (infiniteData?.pages ?? []).map((page) => {
      const pageIds = page.events.map((event) => event.id)
      const options = { eventIds: pageIds, userId }

      return {
        queryKey: buildEnrichedQueryKey(options),
        queryFn: () => fetchEnrichedEvents(options),
      }
    }),
  })

  const enrichedData = useMemo(
    () => enrichmentQueries.flatMap((query) => query.data ?? []),
    [enrichmentQueries]
  )

  // Build an id → enriched event index for O(1) merge lookups
  const enrichedById = useMemo(() => indexEnrichedById(enrichedData), [enrichedData])

  const isEnriching = enrichmentQueries.some((query) => query.isFetching)

  // Merge: search order preserved; enrichment fields replaced where available;
  // fallback to raw search row when enrichment is missing for an id.
  const events = useMemo(
    () => mergeSearchWithEnriched(allSearchEvents, enrichedById),
    [allSearchEvents, enrichedById]
  )

  return {
    events,
    isLoading: isSearchLoading,
    isError: isSearchError,
    isEnriching,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  }
}
