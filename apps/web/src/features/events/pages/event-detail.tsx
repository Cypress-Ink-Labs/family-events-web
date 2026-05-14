import { useState } from "react"
import { useParams } from "react-router-dom"
import { Clock, Star, Users } from "lucide-react"
import { humanizeSupabaseError } from "@/lib/humanize-supabase-error"
import { safeImageSrc } from "@/lib/safe-url"
import { formatEventPrice } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  EventDetailAbout,
  EventDetailBooking,
  EventDetailErrorState,
  EventDetailHero,
  EventDetailInfoGrid,
  EventDetailLoadingState,
  EventDetailLocation,
  EventDetailReviews,
  EventDetailSectionLayout,
  EventDetailSummary,
} from "@/features/events/components/event-detail/event-detail-sections"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useToggleCalendarEvent } from "@/features/events/hooks/use-calendar-events"
import { useComments, useAddComment } from "@/features/events/hooks/use-comments"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { useUpsertRating, useUserRating } from "@/features/events/hooks/use-ratings"
import { FadeSwap } from "@/components/motion"
import { toast } from "sonner"

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const {
    data: events,
    isLoading: isEventLoading,
    isError: isEventError,
  } = useEnrichedEvents({
    eventIds: id ? [id] : undefined,
    userId: user?.id,
    enabled: Boolean(id),
  })
  const event = events?.[0]
  const { data: comments = [] } = useComments(id)
  const { data: userRatingData } = useUserRating(user?.id, id)
  const addComment = useAddComment(user?.id)
  const upsertRating = useUpsertRating(user?.id)
  const toggleCalendarEvent = useToggleCalendarEvent(user?.id)

  const [attendees, setAttendees] = useState(1)
  const [comment, setComment] = useState("")
  const [userRatingOverride, setUserRatingOverride] = useState<{
    eventId: string
    score: number
  } | null>(null)
  const [favoritedOverride, setFavoritedOverride] = useState<{
    eventId: string
    value: boolean
  } | null>(null)
  const [calendarOverride, setCalendarOverride] = useState<{
    eventId: string
    value: boolean
  } | null>(null)

  const userRating =
    userRatingOverride && userRatingOverride.eventId === id
      ? userRatingOverride.score
      : (userRatingData?.score ?? 0)
  const isFavorited =
    favoritedOverride && favoritedOverride.eventId === id
      ? favoritedOverride.value
      : Boolean(event?.is_favorited)
  const isInCalendar =
    calendarOverride && calendarOverride.eventId === id
      ? calendarOverride.value
      : Boolean(event?.is_in_calendar)

  const stateKey = isEventLoading
    ? "event-detail-loading"
    : isEventError || !event
      ? "event-detail-error"
      : "event-detail-content"

  if (isEventLoading) {
    return (
      <FadeSwap stateKey={stateKey}>
        <EventDetailLoadingState />
      </FadeSwap>
    )
  }

  if (isEventError || !event) {
    return (
      <FadeSwap stateKey={stateKey}>
        <EventDetailErrorState />
      </FadeSwap>
    )
  }

  const currentEvent = event
  const imageUrl =
    safeImageSrc(currentEvent.images?.[0]) ??
    `https://picsum.photos/seed/${currentEvent.id}/800/500`
  const startDate = new Date(currentEvent.start_datetime)
  const infoItems = [
    {
      label: "Duration",
      value: currentEvent.end_datetime
        ? `${Math.round((new Date(currentEvent.end_datetime).getTime() - new Date(currentEvent.start_datetime).getTime()) / 60000)} mins`
        : "TBD",
      icon: Clock,
    },
    {
      label: "Price",
      value: formatEventPrice(currentEvent.price, currentEvent.is_free),
      icon: Star,
    },
    { label: "Capacity", value: "12 Spots", icon: Users },
    {
      label: "Rating",
      value: currentEvent.avg_rating
        ? `${currentEvent.avg_rating} (${currentEvent.rating_count})`
        : "No ratings",
      icon: Star,
    },
  ]

  async function handleAddToCalendar() {
    if (!user) {
      toast("Sign in required", {
        description: "Create a free account to save events to your calendar.",
      })
      return
    }

    try {
      const nextState = await toggleCalendarEvent.mutateAsync({
        eventId: currentEvent.id,
        isInCalendar,
      })
      setCalendarOverride({ eventId: currentEvent.id, value: nextState })
      toast.success(nextState ? "Added to your calendar!" : "Removed from calendar")
    } catch (error) {
      toast.error(humanizeSupabaseError(error, "Failed to update calendar."))
    }
  }

  async function handleRatingChange(nextScore: number) {
    if (!user) {
      toast("Sign in to leave a rating")
      return
    }

    setUserRatingOverride({ eventId: currentEvent.id, score: nextScore })
    try {
      await upsertRating.mutateAsync({ eventId: currentEvent.id, score: nextScore })
      toast.success("Rating saved!")
    } catch (error) {
      setUserRatingOverride((prev) => (prev?.eventId === currentEvent.id ? null : prev))
      toast.error(humanizeSupabaseError(error, "Failed to save your rating."))
    }
  }

  async function handleSubmitComment() {
    if (!comment.trim()) return
    if (!user) {
      toast("Sign in to leave a comment")
      return
    }

    try {
      await addComment.mutateAsync({ eventId: currentEvent.id, body: comment.trim() })
      setComment("")
      toast.success("Comment posted!")
    } catch (error) {
      toast.error(humanizeSupabaseError(error, "Failed to post comment."))
    }
  }

  return (
    <FadeSwap stateKey={stateKey} className="max-w-2xl mx-auto">
      <EventDetailHero
        event={currentEvent}
        imageUrl={imageUrl}
        isFavorited={isFavorited}
        onFavoriteToggle={(_, state) =>
          setFavoritedOverride({ eventId: currentEvent.id, value: state })
        }
      />

      <EventDetailSectionLayout>
        <EventDetailSummary event={currentEvent} startDate={startDate} />
        <EventDetailInfoGrid infoItems={infoItems} />
        <EventDetailAbout description={currentEvent.description} />
        <Separator />
        <EventDetailLocation event={currentEvent} />
        <Separator />
        <EventDetailBooking
          event={currentEvent}
          startDate={startDate}
          attendees={attendees}
          onDecrement={() => setAttendees(Math.max(1, attendees - 1))}
          onIncrement={() => setAttendees(Math.min(8, attendees + 1))}
          isInCalendar={isInCalendar}
          onAddToCalendar={handleAddToCalendar}
        />
        <Separator />
        <EventDetailReviews
          canReview={Boolean(user)}
          userRating={userRating}
          comment={comment}
          onCommentChange={setComment}
          onRatingChange={handleRatingChange}
          onSubmitComment={handleSubmitComment}
          isSubmitting={addComment.isPending}
          comments={comments}
        />
      </EventDetailSectionLayout>
    </FadeSwap>
  )
}
