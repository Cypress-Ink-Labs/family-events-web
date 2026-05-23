import type { ElementType } from "react"
import { Link } from "react-router-dom"
import { Clock, Trash2 } from "lucide-react"
import { formatEventDateTime } from "@/shared/utils/dates"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StarRating } from "@/features/events/components/star-rating"
import { SmartImage, StaggerItem, StaggerList } from "@/components/motion"
import { AgeRangeBadge, TagBadge } from "@/features/events/components/tag-badge"
import type { EventWithDetails } from "@/lib/types"
import { safeImageSrc } from "@/infrastructure/safe-url"
import { formatEventPrice } from "@/lib/utils"

export function LoadingRows() {
  return (
    <StaggerList className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <StaggerItem key={`loading-row-${index}`}>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="size-16 sm:h-20 sm:w-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      ))}
    </StaggerList>
  )
}

interface EventRowProps {
  event: EventWithDetails
  onRemove: (id: string) => void
  rating?: number
  onRate?: (score: number) => void
  variant: "upcoming" | "saved" | "past"
}

export function EventRow({ event, onRemove, rating, onRate, variant }: EventRowProps) {
  const imageUrl =
    safeImageSrc(event.images?.[0]) ?? `https://picsum.photos/seed/${event.id}/200/200`
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
              <button
                onClick={() => onRemove(event.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                aria-label="Remove"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>{formatEventDateTime(startDate)}</span>
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={
                  event.is_free
                    ? "text-xs font-bold text-green-600"
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

interface EmptyStateProps {
  icon: ElementType
  title: string
  description: string
  cta: string
  ctaHref: string
}

export function EmptyState({ icon: Icon, title, description, cta, ctaHref }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <Icon className="size-14 text-muted-foreground/25 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-5">{description}</p>
      <Button asChild>
        <Link to={ctaHref}>{cta}</Link>
      </Button>
    </div>
  )
}
