import { ArrowRight, Clock } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { StaggerItem, StaggerList } from "@/components/motion"
import { EventCard } from "@/features/events/components/event-card"
import type { EventWithDetails } from "@/lib/types"

interface DashboardSoonSectionProps {
  events: EventWithDetails[]
  isFavorited: (eventId: string) => boolean
  onFavoriteToggle: (eventId: string, newState: boolean) => void
}

export function DashboardSoonSection({
  events,
  isFavorited,
  onFavoriteToggle,
}: DashboardSoonSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          Happening Soon
        </h2>
        <Button variant="ghost" size="sm" className="text-primary gap-1" asChild>
          <Link to="/explore">
            See all <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map((event) => (
          <StaggerItem key={event.id}>
            <EventCard
              event={{ ...event, is_favorited: isFavorited(event.id) }}
              variant="list"
              onFavoriteToggle={onFavoriteToggle}
            />
          </StaggerItem>
        ))}
      </StaggerList>
    </section>
  )
}
