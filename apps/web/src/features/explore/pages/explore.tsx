import { useMemo } from "react"
import { useApp } from "@/app/stores/app-store"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useExploreStore } from "@/features/explore/stores/explore-store"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { matchesAgeFilter } from "@/features/events/hooks/use-events"
import { useTags } from "@/features/events/hooks/use-tags"
import {
  AGE_OPTIONS,
  ExploreActiveFilters,
  ExploreCategoryGrid,
  ExploreEventsSection,
  ExploreHeader,
  ExploreNeighborhoodCta,
  ExploreSearchFilters,
} from "@/features/explore/components/explore-sections"
import { Page, Stack } from "@/components/v2"

export function ExplorePage() {
  const { user } = useAuth()
  const { selectedCity } = useApp()
  const keyword = useExploreStore((s) => s.keyword)
  const activeDateFilter = useExploreStore((s) => s.activeDateFilter)
  const selectedAge = useExploreStore((s) => s.selectedAge)
  const onlyFree = useExploreStore((s) => s.onlyFree)
  const selectedTagSlugs = useExploreStore((s) => s.selectedTagSlugs)
  const activeCategory = useExploreStore((s) => s.activeCategory)
  const setKeyword = useExploreStore((s) => s.setKeyword)
  const setActiveDateFilter = useExploreStore((s) => s.setActiveDateFilter)
  const setSelectedAge = useExploreStore((s) => s.setSelectedAge)
  const setOnlyFree = useExploreStore((s) => s.setOnlyFree)
  const toggleTagSlug = useExploreStore((s) => s.toggleTagSlug)
  const setActiveCategory = useExploreStore((s) => s.setActiveCategory)
  const resetFilters = useExploreStore((s) => s.resetFilters)

  const ageFilter = AGE_OPTIONS.find((option) => option.label === selectedAge)

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

  const { data: tags = [] } = useTags()
  const {
    data: allEvents = [],
    isLoading: isEventsLoading,
    isError: isEventsError,
  } = useEnrichedEvents({
    cityId: selectedCity?.id,
    userId: user?.id,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  })

  const filteredEvents = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase()
    const from = dateRange.dateFrom ? new Date(dateRange.dateFrom) : null
    const to = dateRange.dateTo ? new Date(dateRange.dateTo) : null
    const tagSlugSet = combinedTagSlugs.length > 0 ? new Set(combinedTagSlugs) : null

    return allEvents.filter((event) => {
      if (trimmedKeyword) {
        const haystack =
          `${event.title} ${event.description ?? ""} ${event.venue_name ?? ""}`.toLowerCase()
        if (!haystack.includes(trimmedKeyword)) {
          return false
        }
      }

      if (from || to) {
        const start = new Date(event.start_datetime)
        if (from && start < from) return false
        if (to && start >= to) return false
      }

      if (onlyFree && !event.is_free) {
        return false
      }

      if (ageFilter && !matchesAgeFilter(event, ageFilter.min, ageFilter.max ?? undefined)) {
        return false
      }

      if (tagSlugSet) {
        const hasMatch = event.tags?.some((et) => tagSlugSet.has(et.tag.slug)) ?? false
        if (!hasMatch) return false
      }

      return true
    })
  }, [allEvents, keyword, dateRange, onlyFree, ageFilter, combinedTagSlugs])

  const activeFilterCount = [
    activeDateFilter,
    selectedAge,
    onlyFree ? "free" : null,
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
          filteredEvents={filteredEvents}
          isEventsLoading={isEventsLoading}
          isEventsError={isEventsError}
          onClearAllFilters={resetFilters}
        />
        <ExploreNeighborhoodCta />
      </Stack>
    </Page>
  )
}
