import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EventCard } from "@/features/events/components/event-card"
import type { EventWithDetails } from "@/lib/types"

interface DashboardSavedSectionProps {
  savedEvents: EventWithDetails[]
  onFavoriteToggle: (eventId: string, newState: boolean) => void
}

export function DashboardSavedSection({
  savedEvents,
  onFavoriteToggle,
}: DashboardSavedSectionProps) {
  if (savedEvents.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Saved Ideas</h2>
        <Button variant="ghost" size="sm" className="text-primary gap-1" asChild>
          <Link to="/saved">
            View all saved <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 divide-y divide-border/50">
          {savedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={{ ...event, is_favorited: true }}
              variant="compact"
              onFavoriteToggle={onFavoriteToggle}
            />
          ))}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full mt-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        asChild
      >
        <Link to="/saved">Explore All Saved ({savedEvents.length})</Link>
      </Button>
    </section>
  )
}
