import { useState } from "react"
import { Link } from "react-router-dom"
import { Bookmark, Clock, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  EmptyState,
  EventRow,
  LoadingRows,
} from "@/features/my-events/components/my-events-sections"
import { FadeSwap, StaggerItem, StaggerList } from "@/components/motion"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useFavorites, useToggleFavorite } from "@/features/events/hooks/use-favorites"
import {
  useCalendarEvents,
  useToggleCalendarEvent,
} from "@/features/events/hooks/use-calendar-events"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { useUpsertRating } from "@/features/events/hooks/use-ratings"
import type { Favorite, UserCalendarEvent } from "@/lib/types"
import { humanizeSupabaseError } from "@/lib/humanize-supabase-error"
import { toast } from "sonner"

export function buildSavedEventIds(
  favorites: Favorite[],
  calendarEvents: UserCalendarEvent[]
): string[] {
  const favoriteIds = new Set(favorites.map((favorite) => favorite.event_id))
  const calendarIds = new Set(calendarEvents.map((calendarEvent) => calendarEvent.event_id))
  return [...new Set([...favoriteIds, ...calendarIds])]
}

export function MyEventsPage() {
  const { user } = useAuth()
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const { data: favorites = [] } = useFavorites(user?.id)
  const { data: calendarEvents = [] } = useCalendarEvents(user?.id)
  const toggleFavorite = useToggleFavorite(user?.id)
  const toggleCalendarEvent = useToggleCalendarEvent(user?.id)
  const upsertRating = useUpsertRating(user?.id)

  const favoriteIds = new Set(favorites.map((favorite) => favorite.event_id))
  const calendarIds = new Set(calendarEvents.map((calendarEvent) => calendarEvent.event_id))
  const savedEventIds = buildSavedEventIds(favorites, calendarEvents)

  // useEnrichedEvents sorts the id array before hashing the query key, so
  // cache hits survive insertion-order churn in the parent sets.
  const { data: savedEvents = [], isLoading: isSavedEventsLoading } = useEnrichedEvents({
    eventIds: savedEventIds,
    userId: user?.id,
  })

  const now = new Date()
  const upcomingEvents = savedEvents.filter((event) => new Date(event.start_datetime) >= now)
  const pastEvents = savedEvents.filter((event) => new Date(event.start_datetime) < now)
  const allSaved = savedEvents

  async function handleRemove(eventId: string) {
    if (!user) {
      return
    }

    try {
      if (favoriteIds.has(eventId)) {
        await toggleFavorite.mutateAsync({ eventId, isFavorited: true })
      }
      if (calendarIds.has(eventId)) {
        await toggleCalendarEvent.mutateAsync({ eventId, isInCalendar: true })
      }
      toast("Removed from saved events")
    } catch (error) {
      toast.error(humanizeSupabaseError(error, "Failed to remove event."))
    }
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Bookmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
        <h1 className="text-2xl font-extrabold text-foreground mb-2">My Events</h1>
        <p className="text-muted-foreground mb-6">Sign in to save and manage your family events.</p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link to="/sign-in">Sign In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/sign-up">Create Account</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">My Events</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {allSaved.length} saved event{allSaved.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
            Upcoming
            {upcomingEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {upcomingEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="saved" className="text-xs sm:text-sm">
            Saved Ideas
            {allSaved.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {allSaved.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="text-xs sm:text-sm">
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <FadeSwap
            stateKey={
              isSavedEventsLoading
                ? "upcoming-loading"
                : upcomingEvents.length === 0
                  ? "upcoming-empty"
                  : "upcoming-content"
            }
          >
            {isSavedEventsLoading ? (
              <LoadingRows />
            ) : upcomingEvents.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No upcoming events"
                description="Browse events and add them to your calendar."
                cta="Explore Events"
                ctaHref="/explore"
              />
            ) : (
              <StaggerList className="space-y-3">
                {upcomingEvents.map((event) => (
                  <StaggerItem key={event.id}>
                    <EventRow event={event} onRemove={handleRemove} variant="upcoming" />
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </FadeSwap>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <FadeSwap
            stateKey={
              isSavedEventsLoading
                ? "saved-loading"
                : allSaved.length === 0
                  ? "saved-empty"
                  : "saved-content"
            }
          >
            {isSavedEventsLoading ? (
              <LoadingRows />
            ) : allSaved.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved events yet"
                description="Tap the heart on any event to save it here."
                cta="Find Events"
                ctaHref="/explore"
              />
            ) : (
              <StaggerList className="space-y-3">
                {allSaved.map((event) => (
                  <StaggerItem key={event.id}>
                    <EventRow event={event} onRemove={handleRemove} variant="saved" />
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </FadeSwap>
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          <FadeSwap
            stateKey={
              isSavedEventsLoading
                ? "past-loading"
                : pastEvents.length === 0
                  ? "past-empty"
                  : "past-content"
            }
          >
            {isSavedEventsLoading ? (
              <LoadingRows />
            ) : pastEvents.length === 0 ? (
              <EmptyState
                icon={Star}
                title="No past events"
                description="Events you've attended will appear here."
                cta="Find Events"
                ctaHref="/explore"
              />
            ) : (
              <StaggerList className="space-y-3">
                {pastEvents.map((event) => (
                  <StaggerItem key={event.id}>
                    <EventRow
                      event={event}
                      onRemove={handleRemove}
                      rating={ratings[event.id]}
                      onRate={async (score) => {
                        setRatings((prev) => ({ ...prev, [event.id]: score }))
                        try {
                          await upsertRating.mutateAsync({ eventId: event.id, score })
                          toast.success("Rating saved!")
                        } catch (error) {
                          toast.error(humanizeSupabaseError(error, "Failed to save rating."))
                        }
                      }}
                      variant="past"
                    />
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </FadeSwap>
        </TabsContent>
      </Tabs>
    </div>
  )
}
