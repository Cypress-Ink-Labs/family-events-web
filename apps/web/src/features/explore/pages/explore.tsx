import { useMemo, useCallback } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useApp } from "@/app/stores/app-store"
import { useExploreStore } from "@/features/explore/stores/explore-store"
import { useTags } from "@/features/events/hooks/use-tags"
import { EXPLORE_AGE_OPTIONS } from "@/features/explore/constants/categories"
import {
  CARD_VARIANT_BY_LAYOUT,
  COMPACT_CONTAINER_CLASSNAME,
  GRID_COLUMN_CLASSNAMES,
  LIST_CONTAINER_CLASSNAME,
} from "@/features/explore/constants/view"
import { useExploreViewStore } from "@/features/explore/stores/explore-view-store"
import {
  ExploreActiveFilters,
  ExploreCategoryGrid,
  ExploreEventsSection,
  ExploreHeader,
  ExploreNeighborhoodCta,
  ExploreSearchFilters,
  ExploreViewControls,
} from "@/features/explore/components/explore-sections"
import { searchEvents } from "@/features/explore/lib/search-api"
import type { SearchEventsParams } from "@/features/explore/lib/search-api"
import { Page, Stack } from "@/components/v2"

export function ExplorePage() {
  const { selectedCity } = useApp()
  const keyword = useExploreStore((s) => s.keyword)
  const activeDateFilter = useExploreStore((s) => s.activeDateFilter)
  const selectedAge = useExploreStore((s) => s.selectedAge)
  const onlyFree = useExploreStore((s) => s.onlyFree)
  const selectedTagSlugs = useExploreStore((s) => s.selectedTagSlugs)
  const activeCategory = useExploreStore((s) => s.activeCategory)
  const nearMeEnabled = useExploreStore((s) => s.nearMeEnabled)
  const radiusKm = useExploreStore((s) => s.radiusKm)
  const location = useExploreStore((s) => s.location)
  const setKeyword = useExploreStore((s) => s.setKeyword)
  const setActiveDateFilter = useExploreStore((s) => s.setActiveDateFilter)
  const setSelectedAge = useExploreStore((s) => s.setSelectedAge)
  const setOnlyFree = useExploreStore((s) => s.setOnlyFree)
  const toggleTagSlug = useExploreStore((s) => s.toggleTagSlug)
  const setActiveCategory = useExploreStore((s) => s.setActiveCategory)
  const resetFilters = useExploreStore((s) => s.resetFilters)

  const layout = useExploreViewStore((s) => s.layout)
  const columns = useExploreViewStore((s) => s.columns)
  const sort = useExploreViewStore((s) => s.sort)
  const showImages = useExploreViewStore((s) => s.showImages)
  const setLayout = useExploreViewStore((s) => s.setLayout)
  const setColumns = useExploreViewStore((s) => s.setColumns)
  const setSort = useExploreViewStore((s) => s.setSort)
  const setShowImages = useExploreViewStore((s) => s.setShowImages)

  const cardVariant = CARD_VARIANT_BY_LAYOUT[layout]
  const containerClassName =
    layout === "grid"
      ? GRID_COLUMN_CLASSNAMES[columns]
      : layout === "list"
        ? LIST_CONTAINER_CLASSNAME
        : COMPACT_CONTAINER_CLASSNAME

  const ageFilter = EXPLORE_AGE_OPTIONS.find((option) => option.label === selectedAge)

  const dateRange = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    if (activeDateFilter === "past") {
      return { dateFrom: undefined, dateTo: startOfToday.toISOString() }
    }

    if (activeDateFilter === "today") {
      const end = new Date(startOfToday)
      end.setDate(end.getDate() + 1)
      return { dateFrom: startOfToday.toISOString(), dateTo: end.toISOString() }
    }

    if (activeDateFilter === "weekend") {
      const day = startOfToday.getDay()
      const daysUntilSaturday = (6 - day + 7) % 7
      const saturday = new Date(startOfToday)
      saturday.setDate(startOfToday.getDate() + daysUntilSaturday)
      const sundayEnd = new Date(saturday)
      sundayEnd.setDate(saturday.getDate() + 2)
      return { dateFrom: saturday.toISOString(), dateTo: sundayEnd.toISOString() }
    }

    if (activeDateFilter === "week") {
      const end = new Date(startOfToday)
      end.setDate(end.getDate() + 7)
      return { dateFrom: startOfToday.toISOString(), dateTo: end.toISOString() }
    }

    if (activeDateFilter === "month") {
      const end = new Date(startOfToday)
      end.setMonth(end.getMonth() + 1)
      return { dateFrom: startOfToday.toISOString(), dateTo: end.toISOString() }
    }

    return { dateFrom: undefined, dateTo: undefined }
  }, [activeDateFilter])

  const combinedTagSlugs = useMemo(() => {
    const all = [...selectedTagSlugs]
    if (activeCategory && !all.includes(activeCategory)) {
      all.push(activeCategory)
    }
    return all
  }, [activeCategory, selectedTagSlugs])

  // Build stable search params for the RPC query key
  const searchParams = useMemo((): SearchEventsParams => {
    const params: SearchEventsParams = {
      keyword: keyword.trim() || undefined,
      cityId: selectedCity?.id,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
      ageMin: ageFilter?.min,
      ageMax: ageFilter?.max ?? undefined,
      isFree: onlyFree || undefined,
      tagSlugs: combinedTagSlugs.length > 0 ? combinedTagSlugs : undefined,
    }
    // Radius filter: only when near-me is on and we have a location
    if (nearMeEnabled && location) {
      params.lat = location.lat
      params.lng = location.lng
      params.radiusKm = radiusKm
    }
    return params
  }, [
    keyword,
    selectedCity?.id,
    dateRange,
    ageFilter,
    onlyFree,
    combinedTagSlugs,
    nearMeEnabled,
    location,
    radiusKm,
  ])

  const { data: tags = [] } = useTags()

  const {
    data: infiniteData,
    isLoading: isEventsLoading,
    isError: isEventsError,
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

  // Flatten all pages into a single array
  const allEvents = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.events) ?? [],
    [infiniteData]
  )

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const activeFilterCount = [
    activeDateFilter,
    selectedAge,
    onlyFree ? "free" : null,
    nearMeEnabled ? "near-me" : null,
    ...selectedTagSlugs,
    activeCategory,
  ].filter(Boolean).length

  return (
    <Page width="content" className="py-6">
      <Stack gap="5">
        <ExploreHeader cityName={selectedCity?.name} />
        <ExploreSearchFilters
          keyword={keyword}
          activeFilterCount={activeFilterCount}
          activeDateFilter={activeDateFilter}
          selectedAge={selectedAge}
          onlyFree={onlyFree}
          selectedTagSlugs={selectedTagSlugs}
          tags={tags}
          onKeywordChange={setKeyword}
          onClearKeyword={() => setKeyword("")}
          onDateFilterChange={setActiveDateFilter}
          onAgeChange={setSelectedAge}
          onOnlyFreeChange={setOnlyFree}
          onToggleTagSlug={toggleTagSlug}
          onClearAllFilters={resetFilters}
          trailing={
            <ExploreViewControls
              layout={layout}
              columns={columns}
              sort={sort}
              showImages={showImages}
              onLayoutChange={setLayout}
              onColumnsChange={setColumns}
              onSortChange={setSort}
              onShowImagesChange={setShowImages}
            />
          }
        />
        <ExploreActiveFilters
          onlyFree={onlyFree}
          activeCategory={activeCategory}
          selectedTagSlugs={selectedTagSlugs}
          tags={tags}
          onOnlyFreeChange={setOnlyFree}
          onActiveCategoryChange={setActiveCategory}
          onToggleTagSlug={toggleTagSlug}
        />
        <ExploreCategoryGrid
          keyword={keyword}
          activeCategory={activeCategory}
          onActiveCategoryChange={setActiveCategory}
        />
        <ExploreEventsSection
          activeCategory={activeCategory}
          filteredEvents={allEvents}
          isEventsLoading={isEventsLoading}
          isEventsError={isEventsError}
          onClearAllFilters={resetFilters}
          cardVariant={cardVariant}
          containerClassName={containerClassName}
          showImages={showImages}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleLoadMore}
        />
        <ExploreNeighborhoodCta />
      </Stack>
    </Page>
  )
}
