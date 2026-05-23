import { Search, SlidersHorizontal, X, Map, Check } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { EventCard, EventCardSkeleton } from "@/features/events/components/event-card"
import { FadeSwap, StaggerItem, StaggerList, popInVariants } from "@/components/motion"
import type { EventWithDetails, Tag } from "@/lib/types"
import {
  EXPLORE_AGE_OPTIONS,
  EXPLORE_CATEGORIES,
  EXPLORE_DATE_QUICK_FILTERS,
} from "@/features/explore/constants/categories"

// Re-exports keep existing call-site imports stable; canonical home is
// `@/features/explore/constants/categories`.
export {
  EXPLORE_AGE_OPTIONS as AGE_OPTIONS,
  EXPLORE_CATEGORIES as CATEGORIES,
  EXPLORE_DATE_QUICK_FILTERS as DATE_QUICK_FILTERS,
}

interface ExploreHeaderProps {
  cityName?: string | null
}

export function ExploreHeader({ cityName }: ExploreHeaderProps) {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-foreground tracking-tight">
        Today&apos;s adventures, <span className="text-primary italic">hand-picked</span> for them.
      </h1>
      <p className="text-muted-foreground text-sm mt-1">
        Discover the best family-friendly events in {cityName ?? "your city"}, curated for every
        stage of play.
      </p>
    </div>
  )
}

interface ExploreSearchFiltersProps {
  keyword: string
  activeFilterCount: number
  activeDateFilter: string | null
  selectedAge: string | null
  onlyFree: boolean
  selectedTagSlugs: string[]
  tags: Tag[]
  onKeywordChange: (value: string) => void
  onClearKeyword: () => void
  onDateFilterChange: (value: string | null) => void
  onAgeChange: (value: string | null) => void
  onOnlyFreeChange: (value: boolean) => void
  onToggleTagSlug: (slug: string) => void
  onClearAllFilters: () => void
}

export function ExploreSearchFilters({
  keyword,
  activeFilterCount,
  activeDateFilter,
  selectedAge,
  onlyFree,
  selectedTagSlugs,
  tags,
  onKeywordChange,
  onClearKeyword,
  onDateFilterChange,
  onAgeChange,
  onOnlyFreeChange,
  onToggleTagSlug,
  onClearAllFilters,
}: ExploreSearchFiltersProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="Find activities nearby..."
          className="pl-9 bg-muted border-0 h-11"
        />
        {keyword && (
          <button
            onClick={onClearKeyword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="h-11 px-4 gap-2 border-border/60 relative">
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0 gap-0" showCloseButton={false}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 h-14 border-b border-border/60 flex-shrink-0">
            <SheetTitle className="text-sm font-semibold tracking-tight">Filters</SheetTitle>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={onClearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              )}
              <SheetClose className="rounded-sm opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-6">
              {/* When */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase mb-3">
                  When
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPLORE_DATE_QUICK_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() =>
                        onDateFilterChange(activeDateFilter === filter.value ? null : filter.value)
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
                        activeDateFilter === filter.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kid's Age */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase mb-3">
                  Kid&apos;s Age
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPLORE_AGE_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() =>
                        onAgeChange(selectedAge === option.label ? null : option.label)
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
                        selectedAge === option.label
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free events toggle */}
              <label
                htmlFor="free-only-switch"
                className={cn(
                  "flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150",
                  onlyFree ? "bg-primary/10" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <span className="text-sm font-medium select-none">Free events only</span>
                <Switch
                  id="free-only-switch"
                  checked={onlyFree}
                  onCheckedChange={onOnlyFreeChange}
                />
              </label>

              {/* Tags */}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase mb-2">
                  Tags
                </p>
                <div className="flex flex-col gap-0.5">
                  {tags.slice(0, 8).map((tag) => {
                    const isSelected = selectedTagSlugs.includes(tag.slug)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => onToggleTagSlug(tag.slug)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full text-left",
                          isSelected
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                        style={isSelected ? { backgroundColor: `${tag.color}20` } : {}}
                      >
                        <span
                          className="size-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1">{tag.name}</span>
                        {isSelected && (
                          <Check className="size-3.5 text-foreground/40 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

interface ExploreActiveFiltersProps {
  onlyFree: boolean
  activeCategory: string | null
  selectedTagSlugs: string[]
  tags: Tag[]
  onOnlyFreeChange: (value: boolean) => void
  onActiveCategoryChange: (value: string | null) => void
  onToggleTagSlug: (slug: string) => void
}

export function ExploreActiveFilters({
  onlyFree,
  activeCategory,
  selectedTagSlugs,
  tags,
  onOnlyFreeChange,
  onActiveCategoryChange,
  onToggleTagSlug,
}: ExploreActiveFiltersProps) {
  if (!onlyFree && !activeCategory && selectedTagSlugs.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence initial={false}>
        {onlyFree && (
          <m.div
            key="filter-free"
            layout
            variants={popInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Badge variant="secondary" className="gap-1">
              Free only
              <button onClick={() => onOnlyFreeChange(false)}>
                <X className="size-3" />
              </button>
            </Badge>
          </m.div>
        )}
        {activeCategory && (
          <m.div
            key={`filter-cat-${activeCategory}`}
            layout
            variants={popInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Badge variant="secondary" className="gap-1 capitalize">
              {activeCategory}
              <button onClick={() => onActiveCategoryChange(null)}>
                <X className="size-3" />
              </button>
            </Badge>
          </m.div>
        )}
        {selectedTagSlugs.map((slug) => {
          const tag = tags.find((item) => item.slug === slug)
          return tag ? (
            <m.div
              key={`filter-tag-${slug}`}
              layout
              variants={popInVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Badge variant="secondary" className="gap-1">
                {tag.name}
                <button onClick={() => onToggleTagSlug(slug)}>
                  <X className="size-3" />
                </button>
              </Badge>
            </m.div>
          ) : null
        })}
      </AnimatePresence>
    </div>
  )
}

interface ExploreCategoryGridProps {
  keyword: string
  activeCategory: string | null
  onActiveCategoryChange: (value: string | null) => void
}

export function ExploreCategoryGrid({
  keyword,
  activeCategory,
  onActiveCategoryChange,
}: ExploreCategoryGridProps) {
  if (keyword || activeCategory) {
    return null
  }

  return (
    <section>
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Explore by Joy
      </p>
      <p className="text-xs text-muted-foreground mb-3">Whatever they're into today</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {EXPLORE_CATEGORIES.map(({ label, icon: Icon, slug, color }) => (
          <button
            key={slug}
            onClick={() => onActiveCategoryChange(activeCategory === slug ? null : slug)}
            className={cn(
              "rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all hover:scale-[1.02]",
              activeCategory === slug
                ? "border-primary bg-primary/5"
                : "border-border/60 bg-card hover:border-primary/30"
            )}
          >
            <div className={cn("size-10 rounded-xl flex items-center justify-center", color)}>
              <Icon className="size-5" />
            </div>
            <span className="text-xs font-semibold text-center text-foreground leading-tight">
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

interface ExploreEventsSectionProps {
  activeCategory: string | null
  filteredEvents: EventWithDetails[]
  isEventsLoading: boolean
  isEventsError: boolean
  onClearAllFilters: () => void
}

export function ExploreEventsSection({
  activeCategory,
  filteredEvents,
  isEventsLoading,
  isEventsError,
  onClearAllFilters,
}: ExploreEventsSectionProps) {
  const activeCategoryLabel = EXPLORE_CATEGORIES.find(
    (category) => category.slug === activeCategory
  )?.label

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {activeCategoryLabel ?? "Happening Soon"}
        </h2>
        <span className="text-sm text-muted-foreground">{filteredEvents.length} events</span>
      </div>

      {isEventsError && (
        <Card className="border-destructive/30 bg-destructive/5 mb-4">
          <CardContent className="p-4 text-sm text-destructive">
            We couldn&apos;t load events. Try refreshing the page.
          </CardContent>
        </Card>
      )}

      <FadeSwap
        stateKey={
          isEventsLoading
            ? "explore-loading"
            : filteredEvents.length === 0
              ? "explore-empty"
              : "explore-content"
        }
      >
        {isEventsLoading ? (
          <StaggerList className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <StaggerItem key={`explore-skeleton-${index}`}>
                <EventCardSkeleton variant="list" />
              </StaggerItem>
            ))}
          </StaggerList>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <Search className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No events found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Try adjusting your filters or search terms
            </p>
            <Button variant="outline" onClick={onClearAllFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <StaggerList className="space-y-4">
            {filteredEvents.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard event={event} variant="list" />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </FadeSwap>
    </section>
  )
}

export function ExploreNeighborhoodCta() {
  return (
    <div className="rounded-2xl bg-muted/60 border border-border/60 p-6 text-center">
      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Map className="size-5 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">New in your neighborhood?</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Check out our interactive map for pop-up play spots.
      </p>
      <Button
        variant="outline"
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
      >
        View Map
      </Button>
    </div>
  )
}
