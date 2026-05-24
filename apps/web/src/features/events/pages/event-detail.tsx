import { useReducer } from "react"
import { useParams } from "react-router-dom"
import { Clock, Star, Users } from "lucide-react"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"
import { safeImageSrc } from "@/infrastructure/safe-url"
import { formatDurationBetween } from "@/shared/utils/dates"
import { formatEventPrice } from "@/shared/utils/format"
import { cleanDescription } from "@family-events/shared"
import { Separator } from "@/shared/components/ui/separator"
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
import { FadeSwap } from "@/shared/components/motion"
import { toast } from "sonner"

interface EventDetailUiState {
  attendees: number
  comment: string
  userRatingOverride: {
    eventId: string
    score: number
  } | null
  favoritedOverride: {
    eventId: string
    value: boolean
  } | null
  calendarOverride: {
    eventId: string
    value: boolean
  } | null
}

const initialEventDetailUiState: EventDetailUiState = {
  attendees: 1,
  comment: "",
  userRatingOverride: null,
  favoritedOverride: null,
  calendarOverride: null,
}

function eventDetailUiReducer(
  state: EventDetailUiState,
  patch: Partial<EventDetailUiState>
): EventDetailUiState {
  return { ...state, ...patch }
}

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

  const [uiState, setUiState] = useReducer(eventDetailUiReducer, initialEventDetailUiState)
  const { attendees, comment, userRatingOverride, favoritedOverride, calendarOverride } = uiState

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
      value: formatDurationBetween(currentEvent.start_datetime, currentEvent.end_datetime),
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
      setUiState({ calendarOverride: { eventId: currentEvent.id, value: nextState } })
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

    setUiState({ userRatingOverride: { eventId: currentEvent.id, score: nextScore } })
    try {
      await upsertRating.mutateAsync({ eventId: currentEvent.id, score: nextScore })
      toast.success("Rating saved!")
    } catch (error) {
      setUiState({
        userRatingOverride:
          userRatingOverride?.eventId === currentEvent.id ? null : userRatingOverride,
      })
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
      setUiState({ comment: "" })
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
          setUiState({ favoritedOverride: { eventId: currentEvent.id, value: state } })
        }
      />

      <EventDetailSectionLayout>
        <EventDetailSummary event={currentEvent} startDate={startDate} />
        <EventDetailInfoGrid infoItems={infoItems} />
        <EventDetailAbout description={cleanDescription(currentEvent.description)} />
        <Separator />
        <EventDetailLocation event={currentEvent} />
        <Separator />
        <EventDetailBooking
          event={currentEvent}
          startDate={startDate}
          attendees={attendees}
          onDecrement={() => setUiState({ attendees: Math.max(1, attendees - 1) })}
          onIncrement={() => setUiState({ attendees: Math.min(8, attendees + 1) })}
          isInCalendar={isInCalendar}
          onAddToCalendar={handleAddToCalendar}
        />
        <Separator />
        <EventDetailReviews
          canReview={Boolean(user)}
          userRating={userRating}
          comment={comment}
          onCommentChange={(comment) => setUiState({ comment })}
          onRatingChange={handleRatingChange}
          onSubmitComment={handleSubmitComment}
          isSubmitting={addComment.isPending}
          comments={comments}
        />
      </EventDetailSectionLayout>
    </FadeSwap>
  )
}
