import { Bookmark } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { FadeSwap, StaggerItem, StaggerList } from "@/shared/components/motion"
import { EventCard, EventCardSkeleton } from "@/features/events/components/event-card"
import type { EventWithDetails } from "@/shared/types"

interface SavedEventsSectionProps {
  savedEvents: EventWithDetails[]
  isLoading: boolean
  isFavorited: (eventId: string) => boolean
  onFavoriteToggle: (eventId: string, nextState: boolean) => void
}

export function SavedEventsSection({
  savedEvents,
  isLoading,
  isFavorited,
  onFavoriteToggle,
}: SavedEventsSectionProps) {
  return (
    <section>
      <Separator className="mb-6" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Saved Events</h2>
        <span className="text-sm text-muted-foreground">{savedEvents.length} saved</span>
      </div>
      <FadeSwap
        stateKey={
          isLoading
            ? "calendar-saved-loading"
            : savedEvents.length === 0
              ? "calendar-saved-empty"
              : "calendar-saved-content"
        }
      >
        {isLoading ? (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <StaggerItem key={`saved-events-skeleton-${index}`}>
                <EventCardSkeleton />
              </StaggerItem>
            ))}
          </StaggerList>
        ) : savedEvents.length === 0 ? (
          <div className="py-16 text-center">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bookmark className="size-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No saved events yet</h3>
            <p className="text-muted-foreground text-sm mb-5">
              Browse events and tap the heart to save them here.
            </p>
            <Button asChild>
              <Link to="/explore">Explore Events</Link>
            </Button>
          </div>
        ) : (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedEvents.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard
                  event={{ ...event, is_favorited: isFavorited(event.id) }}
                  variant="default"
                  onFavoriteToggle={onFavoriteToggle}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </FadeSwap>
    </section>
  )
}
