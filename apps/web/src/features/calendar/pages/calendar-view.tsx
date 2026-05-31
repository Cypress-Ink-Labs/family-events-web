import { useMemo, useReducer, useState } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns"
import {
  CalendarErrorState,
  CalendarMonthPanel,
  CalendarWeekPanel,
  CalendarSelectedDatePanel,
  CalendarStatsPanel,
  CalendarViewHeader,
  SavedEventsSection,
} from "@/features/calendar/components/calendar-view-sections"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { useDocumentTitle } from "@/shared/hooks/use-document-title"
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { useFavorites } from "@/features/events/hooks/use-favorites"
import { useCalendarEvents } from "@/features/events/hooks/use-calendar-events"
import { Page, Stack } from "@/components/v2"

function favoriteOverridesReducer(state: Record<string, boolean>, patch: Record<string, boolean>) {
  return { ...state, ...patch }
}

export function CalendarViewPage() {
  useDocumentTitle("Calendar")

  const { user } = useAuth()
  const { selectedCity } = useApp()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week">("month")
  const [hidePastEvents, setHidePastEvents] = useState(true)
  const [favoriteOverrides, setFavoriteOverrides] = useReducer(favoriteOverridesReducer, {})

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = monthStart.getDay()

  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const today = startOfDay(new Date())
  const dateFrom =
    view === "week" ? (hidePastEvents ? today : weekStart) : hidePastEvents ? today : monthStart
  const dateTo = view === "week" ? weekEnd : monthEnd

  const {
    data: monthEvents = [],
    isLoading: isMonthEventsLoading,
    isError: isMonthEventsError,
  } = useEnrichedEvents({
    cityId: selectedCity?.id,
    userId: user?.id,
    dateFrom,
    dateTo,
    limit: 500,
  })

  const { data: favorites = [] } = useFavorites(user?.id)
  const { data: calendarEvents = [] } = useCalendarEvents(user?.id)

  const savedEventIds = useMemo(() => {
    return new Set([
      ...favorites.map((favorite) => favorite.event_id),
      ...calendarEvents.map((calendarEvent) => calendarEvent.event_id),
    ])
  }, [calendarEvents, favorites])

  const savedIdsArray = useMemo(() => [...savedEventIds], [savedEventIds])
  const { data: savedEvents = [], isLoading: isSavedEventsLoading } = useEnrichedEvents({
    eventIds: savedIdsArray,
    userId: user?.id,
  })

  const baseFavoritedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const event of [...monthEvents, ...savedEvents]) {
      if (event.is_favorited || savedEventIds.has(event.id)) {
        ids.add(event.id)
      }
    }
    return ids
  }, [monthEvents, savedEventIds, savedEvents])

  function isFavorited(eventId: string) {
    return favoriteOverrides[eventId] ?? baseFavoritedIds.has(eventId)
  }

  const eventsForSelectedDate = monthEvents
    .filter((event) => isSameDay(new Date(event.start_datetime), selectedDate))
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())

  const upcomingCount = savedEvents.filter(
    (event) => new Date(event.start_datetime) >= new Date()
  ).length

  function getEventsForDay(day: Date) {
    return monthEvents.filter((event) => isSameDay(new Date(event.start_datetime), day))
  }

  function handleFavoriteToggle(eventId: string, newState: boolean) {
    setFavoriteOverrides({ [eventId]: newState })
  }

  // Week nav intentionally also moves currentMonth so switching to month view stays aligned.
  function handlePreviousWeek() {
    const newDate = subWeeks(selectedDate, 1)
    setSelectedDate(newDate)
    setCurrentMonth(newDate)
  }

  function handleNextWeek() {
    const newDate = addWeeks(selectedDate, 1)
    setSelectedDate(newDate)
    setCurrentMonth(newDate)
  }

  return (
    <Page width="content" className="py-6">
      <Stack gap="5">
        <CalendarViewHeader
          view={view}
          onViewChange={setView}
          hidePastEvents={hidePastEvents}
          onHidePastEventsChange={setHidePastEvents}
          isLoggedIn={Boolean(user)}
        />
        {isMonthEventsError && <CalendarErrorState />}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {view === "week" ? (
            <CalendarWeekPanel
              weekDays={weekDays}
              selectedDate={selectedDate}
              getEventsForDay={getEventsForDay}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <CalendarMonthPanel
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              firstDayOfWeek={firstDayOfWeek}
              days={days}
              getEventsForDay={getEventsForDay}
              onPreviousMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
              onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
              onSelectDate={setSelectedDate}
            />
          )}
          <div className="lg:col-span-2 space-y-4">
            <CalendarSelectedDatePanel
              selectedDate={selectedDate}
              events={eventsForSelectedDate}
              isLoading={isMonthEventsLoading}
              isFavorited={isFavorited}
              onFavoriteToggle={handleFavoriteToggle}
            />
            {user && (
              <CalendarStatsPanel savedCount={savedEventIds.size} upcomingCount={upcomingCount} />
            )}
          </div>
        </div>
        {user && (
          <SavedEventsSection
            savedEvents={savedEvents}
            isLoading={isSavedEventsLoading}
            isFavorited={isFavorited}
            onFavoriteToggle={handleFavoriteToggle}
          />
        )}
      </Stack>
    </Page>
  )
}
