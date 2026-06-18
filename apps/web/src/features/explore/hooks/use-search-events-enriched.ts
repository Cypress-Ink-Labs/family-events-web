import { useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
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
 * events_enriched (tags, ratings, favorite state) via a single batched
 * enrichment call per loaded page of ids.
 *
 * Enrichment is BATCHED: one events_enriched call covers all ids currently
 * loaded across all pages — not one call per event. React Query deduplicates
 * this automatically because the by-ids key is sorted and stable.
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

  // Collect all currently-loaded event ids for a single batched enrichment call
  const allEventIds = useMemo(() => allSearchEvents.map((e) => e.id), [allSearchEvents])

  // --- Enrichment query (batched over all loaded ids) ---
  // One call per set of loaded ids — never one call per event (N+1 avoided).
  // Disabled when there are no ids to enrich.
  const { data: enrichedData, isFetching: isEnrichmentFetching } = useEnrichedEvents({
    eventIds: allEventIds,
    userId,
    enabled: allEventIds.length > 0,
  })

  // Build an id → enriched event index for O(1) merge lookups
  const enrichedById = useMemo(() => indexEnrichedById(enrichedData ?? []), [enrichedData])

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
    isEnriching: isEnrichmentFetching,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  }
}
