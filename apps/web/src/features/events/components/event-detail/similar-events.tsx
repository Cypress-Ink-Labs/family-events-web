import { useSimilarEvents } from "@/features/events/hooks/use-similar-events"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { EventCard, EventCardSkeleton } from "@/features/events/components/event-card"
import { StaggerItem, StaggerList } from "@/shared/components/motion"

interface SimilarEventsSectionProps {
  eventId: string
  cityId?: string | null
  userId?: string
}

export function SimilarEventsSection({ eventId, cityId, userId }: SimilarEventsSectionProps) {
  const { data: similarEvents, isLoading: isSimilarLoading } = useSimilarEvents(
    eventId,
    cityId ?? undefined
  )

  const similarIds = similarEvents?.map((e) => e.event_id) ?? []

  const { data: enrichedSimilar = [], isLoading: isEnrichedLoading } = useEnrichedEvents({
    eventIds: similarIds,
    userId,
    enabled: similarIds.length > 0,
  })

  const isLoading = isSimilarLoading || isEnrichedLoading

  // Don't render the section if no similar events after loading
  if (!isLoading && enrichedSimilar.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Similar Events</h3>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <EventCardSkeleton key={`similar-skeleton-${i}`} variant="default" />
          ))}
        </div>
      ) : (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {enrichedSimilar.slice(0, 5).map((event) => (
            <StaggerItem key={event.id}>
              <EventCard event={event} variant="compact" />
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
