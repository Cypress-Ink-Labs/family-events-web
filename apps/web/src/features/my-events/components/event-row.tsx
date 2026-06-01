import { Link } from "react-router"
import { Clock, Trash2 } from "lucide-react"
import { formatEventDateTime } from "@/shared/utils/dates"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { StarRating } from "@/features/events/components/star-rating"
import { SmartImage } from "@/shared/components/motion"
import { AgeRangeBadge, TagBadge } from "@/features/events/components/tag-badge"
import type { EventWithDetails } from "@/shared/types"
import { safeImageSrc } from "@/infrastructure/safe-url"
import { getFallbackImageUrl } from "@/features/events/lib/fallback-images"
import { formatEventPrice } from "@/shared/utils/format"

interface EventRowProps {
  event: EventWithDetails
  onRemove: (id: string) => void
  rating?: number
  onRate?: (score: number) => void
  variant: "upcoming" | "saved" | "past"
}

export function EventRow({ event, onRemove, rating, onRate, variant }: EventRowProps) {
  const imageUrl =
    safeImageSrc(event.images?.[0]) ??
    getFallbackImageUrl(
      event.id,
      (event.tags ?? []).map((t) => t.tag.slug),
      200,
      200
    )
  const startDate = new Date(event.start_datetime)

  return (
    <Card className="border-border/60 hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Link to={`/events/${event.id}`} className="shrink-0">
            <div className="size-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-muted">
              <SmartImage
                src={imageUrl}
                alt={event.title}
                variant="thumbnail"
                className="size-full object-cover"
                placeholderClassName="size-full"
              />
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/events/${event.id}`} className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
                  {event.title}
                </h3>
              </Link>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => onRemove(event.id)}
                aria-label="Remove"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>{formatEventDateTime(startDate)}</span>
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={
                  event.is_free
                    ? "text-xs font-bold text-[var(--color-accent-kid)]"
                    : "text-xs font-bold text-primary"
                }
              >
                {formatEventPrice(event.price, event.is_free)}
              </span>
              <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
              {event.tags?.[0]?.tag && <TagBadge tag={event.tags[0].tag} />}
            </div>

            {variant === "past" && onRate && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rate:</span>
                <StarRating value={rating ?? 0} onChange={onRate} size="sm" />
              </div>
            )}

            {variant === "upcoming" && (
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                  <Link to={`/events/${event.id}`}>View Details</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
