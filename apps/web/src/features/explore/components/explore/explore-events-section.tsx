import { Search } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { EventCard, EventCardSkeleton } from "@/features/events/components/event-card"
import type { EventCardVariant } from "@/features/events/components/event-card/_shared"
import { FadeSwap, StaggerItem, StaggerList } from "@/shared/components/motion"
import type { EventWithDetails } from "@/shared/types"
import { EXPLORE_CATEGORIES } from "@/features/explore/constants/categories"

interface ExploreEventsSectionProps {
  activeCategory: string | null
  filteredEvents: EventWithDetails[]
  isEventsLoading: boolean
  isEventsError: boolean
  onClearAllFilters: () => void
  cardVariant: EventCardVariant
  containerClassName: string
  showImages: boolean
}

export function ExploreEventsSection({
  activeCategory,
  filteredEvents,
  isEventsLoading,
  isEventsError,
  onClearAllFilters,
  cardVariant,
  containerClassName,
  showImages,
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
          <StaggerList className={containerClassName}>
            {Array.from({ length: 8 }).map((_, index) => (
              <StaggerItem key={`explore-skeleton-${index}`}>
                <EventCardSkeleton variant={cardVariant === "featured" ? "default" : cardVariant} />
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
          <StaggerList className={containerClassName}>
            {filteredEvents.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard event={event} variant={cardVariant} showImages={showImages} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </FadeSwap>
    </section>
  )
}
