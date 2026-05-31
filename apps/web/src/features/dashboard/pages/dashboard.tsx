import { useMemo, useReducer } from "react"
import { useDocumentTitle } from "@/shared/hooks/use-document-title"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { sortByStartDatetime } from "@/shared/utils/dates"
import { FadeSwap } from "@/shared/components/motion"
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
import { Page, Stack } from "@/components/v2"
import { formatDayKey } from "@/shared/lib/intl-formatters"

function favoriteOverridesReducer(state: Record<string, boolean>, patch: Record<string, boolean>) {
  return { ...state, ...patch }
}

export function DashboardPage() {
  useDocumentTitle("Home")

  const { user, profile } = useAuth()
  const { selectedCity } = useApp()
  const [favoriteOverrides, setFavoriteOverrides] = useReducer(favoriteOverridesReducer, {})
  const {
    data: events = [],
    isLoading: isEventsLoading,
    isError: isEventsError,
  } = useEnrichedEvents({
    cityId: selectedCity?.id,
    userId: user?.id,
  })

  const baseFavoritedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const event of events) {
      if (event.is_favorited) {
        ids.add(event.id)
      }
    }
    return ids
  }, [events])

  function isFavorited(eventId: string) {
    return favoriteOverrides[eventId] ?? baseFavoritedIds.has(eventId)
  }

  function handleFavoriteToggle(eventId: string, newState: boolean) {
    setFavoriteOverrides({ [eventId]: newState })
  }

  const featuredEvents = useMemo(
    () =>
      sortByStartDatetime(
        events.filter((e) => e.is_featured),
        "asc"
      ),
    [events]
  )
  const happeningSoon = useMemo(
    () =>
      sortByStartDatetime(
        events.filter((e) => !e.is_featured),
        "asc"
      ).slice(0, 4),
    [events]
  )
  const recommended = useMemo(() => sortByStartDatetime(events, "asc").slice(0, 4), [events])
  const savedEvents = events.filter((event) => isFavorited(event.id)).slice(0, 3)
  const selectedTimeZone = selectedCity?.timezone ?? "UTC"
  const todayKey = useMemo(() => formatDayKey(new Date(), selectedTimeZone), [selectedTimeZone])
  const isToday = (start: string, tz: string) => {
    const referenceKey = tz === selectedTimeZone ? todayKey : formatDayKey(new Date(), tz)
    return formatDayKey(new Date(start), tz) === referenceKey
  }
  const todayEvents: typeof events = []
  for (const e of events) {
    if (todayEvents.length >= 2) break
    if (isToday(e.start_datetime, e.timezone || selectedTimeZone)) {
      todayEvents.push(e)
    }
  }

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
    <Page width="content" className="py-6">
      <Stack gap="6">
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
      </Stack>
    </Page>
  )
}
