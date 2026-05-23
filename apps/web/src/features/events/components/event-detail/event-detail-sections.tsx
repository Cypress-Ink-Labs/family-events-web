import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { format } from "date-fns"
import { ArrowLeft, CalendarPlus, Clock, Info, MapPin, Share2 } from "lucide-react"
import { formatEventDate, formatEventTime } from "@/shared/utils/dates"
import type { CommentWithProfile, EventWithDetails } from "@/lib/types"
import { safeHref } from "@/lib/platform/safe-url"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ClientDate } from "@/components/client-date"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { AgeRangeBadge, TagBadge } from "@/features/events/components/tag-badge"
import { EventMapMini } from "@/features/events/components/event-map-mini"
import { FavoriteButton } from "@/features/events/components/favorite-button"
import { SmartImage } from "@/components/motion"
import { StarRating } from "@/features/events/components/star-rating"
import { FormGrid } from "@/components/v2"
import { cleanDescription } from "@family-events/shared"

interface EventDetailInfoItem {
  label: string
  value: string
  icon: typeof Clock
}

export function EventDetailLoadingState() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="sticky top-14 z-30 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-2">
        <div className="flex items-center gap-2 -ml-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <Skeleton className="w-full h-64 sm:h-80 rounded-none" />
      <div className="px-4 py-6 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`event-info-skeleton-${index}`} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-4" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function EventDetailErrorState() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-destructive">We couldn&apos;t load that event right now.</p>
          <Button variant="outline" asChild>
            <Link to="/explore">Back to Explore</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface EventDetailHeroProps {
  event: EventWithDetails
  imageUrl: string
  isFavorited: boolean
  onFavoriteToggle: (eventId: string, state: boolean) => void
}

export function EventDetailHero({
  event,
  imageUrl,
  isFavorited,
  onFavoriteToggle,
}: EventDetailHeroProps) {
  return (
    <>
      <div className="sticky top-14 z-30 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-2">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
          <Link to="/explore">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
      </div>

      <div className="relative">
        <SmartImage
          src={imageUrl}
          alt={event.title}
          className="w-full h-64 sm:h-80 object-cover"
          placeholderClassName="w-full h-64 sm:h-80"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
        <div className="absolute top-4 right-4 flex gap-2">
          <FavoriteButton
            eventId={event.id}
            isFavorited={isFavorited}
            onToggle={onFavoriteToggle}
            variant="overlay"
          />
          <button className="size-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
            <Share2 className="size-4 text-foreground" />
          </button>
        </div>
      </div>
    </>
  )
}

export function EventDetailSectionLayout({ children }: { children: ReactNode }) {
  return <div className="px-4 py-6 space-y-6">{children}</div>
}

interface EventDetailSummaryProps {
  event: EventWithDetails
  startDate: Date
}

export function EventDetailSummary({ event, startDate }: EventDetailSummaryProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          {format(startDate, "EEEE MMMM")} Morning
        </span>
      </div>
      <h1 className="text-2xl font-semibold text-foreground tracking-tight">{event.title}</h1>
      <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
        {(cleanDescription(event.description) ?? "").slice(0, 100)}
      </p>

      <div className="flex flex-wrap gap-2 mt-3">
        <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
        {event.tags?.slice(0, 3).map((tag) => (
          <TagBadge key={tag.tag_id} tag={tag.tag} />
        ))}
      </div>
    </div>
  )
}

export function EventDetailInfoGrid({ infoItems }: { infoItems: EventDetailInfoItem[] }) {
  return (
    <FormGrid cols={2} gap="3">
      {infoItems.map((item) => (
        <Card key={item.label} className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <item.icon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="font-display text-sm font-medium text-foreground">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </FormGrid>
  )
}

export function EventDetailAbout({ description }: { description: string | null }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">About the Experience</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

      <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-4 flex gap-3">
        <Info className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">
            Parent Tip
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-500 leading-relaxed">
            We recommend arriving 10 minutes early to let your toddler get comfortable with the
            space before the session begins!
          </p>
        </div>
      </div>
    </div>
  )
}

export function EventDetailLocation({ event }: { event: EventWithDetails }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">Location</h2>
      <div className="flex items-start gap-3 mb-3">
        <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
        <div>
          {event.venue_name && (
            <p className="text-sm font-semibold text-foreground">{event.venue_name}</p>
          )}
          {event.address && event.address !== event.venue_name && (
            <p className="text-sm text-muted-foreground">{event.address}</p>
          )}
        </div>
      </div>
      <EventMapMini
        latitude={event.latitude}
        longitude={event.longitude}
        venueName={event.venue_name}
        address={event.address}
        startDatetime={event.start_datetime}
      />
    </div>
  )
}

interface EventDetailBookingProps {
  event: EventWithDetails
  startDate: Date
  attendees: number
  onDecrement: () => void
  onIncrement: () => void
  isInCalendar: boolean
  onAddToCalendar: () => void
}

export function EventDetailBooking({
  event,
  startDate,
  attendees,
  onDecrement,
  onIncrement,
  isInCalendar,
  onAddToCalendar,
}: EventDetailBookingProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Reserve Your Spot</h2>
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Date</span>
          <span className="text-sm font-semibold">{formatEventDate(startDate)}</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border/40">
          <span className="text-sm text-muted-foreground">Time</span>
          <span className="text-sm font-semibold">{formatEventTime(startDate)}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-muted-foreground">Attendees</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onDecrement}
              className="flex size-11 items-center justify-center rounded-full border border-border text-base font-bold hover:bg-accent"
            >
              −
            </button>
            <span className="text-sm font-bold w-4 text-center">{attendees}</span>
            <button
              onClick={onIncrement}
              className="flex size-11 items-center justify-center rounded-full border border-border text-base font-bold hover:bg-accent"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <Button className="w-full h-12 text-base font-bold" asChild>
        <a href={safeHref(event.source_url)} target="_blank" rel="noopener noreferrer">
          {event.is_free
            ? "Reserve Your Spot (Free)"
            : event.price != null
              ? `Book Now · $${event.price * attendees}`
              : "Book Now"}
        </a>
      </Button>
      <Button
        variant="outline"
        className={cn(
          "w-full h-11 mt-3 gap-2",
          isInCalendar && "border-primary text-primary bg-primary/5"
        )}
        onClick={onAddToCalendar}
      >
        <CalendarPlus className="size-4" />
        {isInCalendar ? "Added to Calendar" : "Add to Calendar"}
      </Button>

      <div className="flex items-center justify-center gap-1.5 mt-3">
        <div className="size-1.5 rounded-full bg-green-500" />
        <span className="text-xs text-muted-foreground">SECURE PARENTING PLATFORM</span>
      </div>
    </div>
  )
}

interface EventDetailReviewsProps {
  canReview: boolean
  userRating: number
  comment: string
  onCommentChange: (value: string) => void
  onRatingChange: (value: number) => void
  onSubmitComment: () => void
  isSubmitting: boolean
  comments: CommentWithProfile[]
}

export function EventDetailReviews({
  canReview,
  userRating,
  comment,
  onCommentChange,
  onRatingChange,
  onSubmitComment,
  isSubmitting,
  comments,
}: EventDetailReviewsProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Reviews</h2>

      {canReview && (
        <Card className="border-border/60 mb-4">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Leave a review</p>
            <StarRating value={userRating} onChange={onRatingChange} size="lg" />
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
            <Button size="sm" disabled={isSubmitting || !comment.trim()} onClick={onSubmitComment}>
              {isSubmitting ? "Posting..." : "Post Review"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {comments.map((commentEntry) => (
          <div key={commentEntry.id} className="flex gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs bg-muted">
                {(commentEntry.user_profiles?.display_name || "U").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {commentEntry.user_profiles?.display_name || "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  <ClientDate value={commentEntry.created_at} pattern="MMM d, yyyy" />
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{commentEntry.body}</p>
            </div>
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to add one.</p>
      )}

      {!canReview && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Sign in to leave a review</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/sign-in">Sign In</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
