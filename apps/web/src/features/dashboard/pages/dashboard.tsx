import { useMemo, useState } from "react"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { FadeSwap } from "@/components/motion"
import {
  DashboardCarouselSection,
  DashboardEmptyState,
  DashboardErrorState,
  DashboardGuestCta,
  DashboardHeader,
  DashboardLoadingState,
  DashboardParentPulse,
  DashboardSavedSection,
  DashboardSoonSection,
  DashboardTodaySection,
} from "@/features/dashboard/components/dashboard-sections"

export function DashboardPage() {
  const { user, profile } = useAuth()
  const { selectedCity } = useApp()
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({})
  const {
    data: events = [],
    isLoading: isEventsLoading,
    isError: isEventsError,
  } = useEnrichedEvents({
    cityId: selectedCity?.id,
    userId: user?.id,
  })

  const baseFavoritedIds = useMemo(
    () => new Set(events.filter((event) => event.is_favorited).map((event) => event.id)),
    [events]
  )

  function isFavorited(eventId: string) {
    return favoriteOverrides[eventId] ?? baseFavoritedIds.has(eventId)
  }

  function handleFavoriteToggle(eventId: string, newState: boolean) {
    setFavoriteOverrides((prev) => ({ ...prev, [eventId]: newState }))
  }

  const featuredEvents = events.filter((event) => event.is_featured)
  const happeningSoon = events.filter((event) => !event.is_featured).slice(0, 4)
  const recommended = events.slice(0, 4)
  const savedEvents = events.filter((event) => isFavorited(event.id)).slice(0, 3)
  const todayEvents = events
    .filter((e) => {
      const tz = e.timezone || selectedCity?.timezone || "UTC"
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      return fmt.format(new Date(e.start_datetime)) === fmt.format(new Date())
    })
    .slice(0, 2)

  const greeting = profile?.display_name
    ? `Welcome back, ${profile.display_name.split(" ")[0]}!`
    : "Today's adventures"

  const bodyKey = isEventsError
    ? "dashboard-error"
    : isEventsLoading
      ? "dashboard-loading"
      : events.length === 0
        ? "dashboard-empty"
        : "dashboard-content"

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <DashboardHeader
        greeting={greeting}
        childName={profile?.child_name}
        userInitial={profile?.display_name?.charAt(0)?.toUpperCase() ?? "U"}
        avatarUrl={profile?.avatar_url}
        showAvatar={Boolean(user)}
      />
      <FadeSwap stateKey={bodyKey} className="space-y-8">
        {bodyKey === "dashboard-error" ? (
          <DashboardErrorState />
        ) : bodyKey === "dashboard-loading" ? (
          <DashboardLoadingState />
        ) : bodyKey === "dashboard-empty" ? (
          <DashboardEmptyState />
        ) : (
          <>
            <DashboardTodaySection todayEvents={todayEvents} />
            <DashboardCarouselSection
              title="Featured Events"
              icon="featured"
              events={featuredEvents}
              eventCardVariant="featured"
              isFavorited={isFavorited}
              onFavoriteToggle={handleFavoriteToggle}
            />
            <DashboardCarouselSection
              title={
                user && profile?.child_name
                  ? `Recommended for ${profile.child_name}`
                  : "Happening Near You"
              }
              icon="recommended"
              events={recommended}
              eventCardVariant="default"
              isFavorited={isFavorited}
              onFavoriteToggle={handleFavoriteToggle}
            />
            <DashboardSoonSection
              events={happeningSoon}
              isFavorited={isFavorited}
              onFavoriteToggle={handleFavoriteToggle}
            />
            <DashboardSavedSection
              savedEvents={savedEvents}
              onFavoriteToggle={handleFavoriteToggle}
            />
            <DashboardParentPulse />
            {!user && <DashboardGuestCta />}
          </>
        )}
      </FadeSwap>
    </div>
  )
}
