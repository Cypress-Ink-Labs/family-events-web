import { Link } from "react-router-dom"
import { format } from "date-fns"
import { Clock, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FavoriteButton } from "@/features/events/components/favorite-button"
import { SmartImage } from "@/components/motion"
import { safeImageSrc } from "@/lib/safe-url"
import { formatEventPrice } from "@/lib/utils"
import type { PlannedEvent } from "@/features/plan/hooks/use-plan-for-today"

interface PlanThumbCardProps {
  event: PlannedEvent
}

function formatMatch(score: number): string {
  const safe = Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0
  return `${Math.round(safe * 100)}% match`
}

export function PlanThumbCard({ event }: PlanThumbCardProps) {
  const imageUrl =
    safeImageSrc(event.images?.[0]) ?? `https://picsum.photos/seed/${event.id}/640/360`

  return (
    <Link to={`/events/${event.id}`} className="block">
      <Card className="overflow-hidden border-border/60 transition-shadow hover:shadow-sm">
        <div className="relative">
          <SmartImage
            src={imageUrl}
            alt={event.title}
            className="h-36 w-full object-cover"
            placeholderClassName="h-36 w-full"
          />
          <FavoriteButton
            eventId={event.id}
            isFavorited={event.is_favorited ?? false}
            variant="overlay"
          />
        </div>
        <CardContent className="space-y-2 p-3">
          <h3 className="line-clamp-2 text-sm font-bold text-foreground">{event.title}</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(event.start_datetime), "EEE · h:mm a")}
            </div>
            {event.venue_name ? (
              <div className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{event.venue_name}</span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{formatEventPrice(event.price, event.is_free)}</Badge>
            <span className="text-[11px] text-muted-foreground">
              {formatMatch(event.plan_score)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
