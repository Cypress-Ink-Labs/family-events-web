import { Link } from "react-router-dom"
import { format } from "date-fns"
import { Clock, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/features/events/components/favorite-button"
import { ShareEventButton } from "@/features/plan/components/share-event-button"
import { SmartImage } from "@/components/motion"
import { safeImageSrc } from "@/lib/safe-url"
import { formatEventPrice } from "@/lib/utils"
import type { PlannedEvent } from "@/features/plan/hooks/use-plan-for-today"

interface PlanHeroCardProps {
  event: PlannedEvent
}

function formatDistance(distanceKm: number | null): string | null {
  if (distanceKm == null || Number.isNaN(distanceKm)) {
    return null
  }
  return `${distanceKm.toFixed(1)} km away`
}

function formatMatch(score: number): string {
  return `${Math.round(score * 100)}% match`
}

export function PlanHeroCard({ event }: PlanHeroCardProps) {
  const imageUrl =
    safeImageSrc(event.images?.[0]) ?? `https://picsum.photos/seed/${event.id}/1200/630`
  const distanceLabel = formatDistance(event.distance_km)

  return (
    <Card className="overflow-hidden border-primary/30 bg-card shadow-sm">
      <div className="relative">
        <SmartImage
          src={imageUrl}
          alt={event.title}
          className="h-64 w-full object-cover sm:h-72"
          placeholderClassName="h-64 w-full sm:h-72"
        />
        <div className="absolute left-3 top-3">
          <Badge className="bg-primary text-primary-foreground">Best match this week</Badge>
        </div>
        <div className="absolute right-3 top-3">
          <FavoriteButton
            eventId={event.id}
            isFavorited={event.is_favorited ?? false}
            variant="overlay"
          />
        </div>
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{event.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(event.start_datetime), "EEE, MMM d · h:mm a")}
            </span>
            {event.venue_name ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.venue_name}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{formatEventPrice(event.price, event.is_free)}</Badge>
          {distanceLabel ? <Badge variant="outline">{distanceLabel}</Badge> : null}
          <Badge variant="outline">{formatMatch(event.plan_score)}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <ShareEventButton eventId={event.id} eventTitle={event.title} />
          <Button variant="outline" asChild>
            <Link to={`/events/${event.id}`}>View details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
