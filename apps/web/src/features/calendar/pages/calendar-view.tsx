import { useMemo, useState } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
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
import { useEnrichedEvents } from "@/features/events/hooks/use-enriched-events"
import { useFavorites } from "@/features/events/hooks/use-favorites"
import { useCalendarEvents } from "@/features/events/hooks/use-calendar-events"
import { Page, Stack } from "@/components/v2"

export function CalendarViewPage() {
  const { user } = useAuth()
  const { selectedCity } = useApp()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week">("month")
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({})

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = monthStart.getDay()

  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const dateFrom = view === "week" ? weekStart : monthStart
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

  const eventsForSelectedDate = monthEvents.filter((event) => {
    const eventDate = new Date(event.start_datetime)
    return isSameDay(eventDate, selectedDate)
  })

  const upcomingCount = savedEvents.filter(
    (event) => new Date(event.start_datetime) >= new Date()
  ).length

  function getEventsForDay(day: Date) {
    return monthEvents.filter((event) => isSameDay(new Date(event.start_datetime), day))
  }

  function handleFavoriteToggle(eventId: string, newState: boolean) {
    setFavoriteOverrides((prev) => ({ ...prev, [eventId]: newState }))
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
        <CalendarViewHeader view={view} onViewChange={setView} />
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
            <CalendarStatsPanel savedCount={savedEventIds.size} upcomingCount={upcomingCount} />
          </div>
        </div>
        <SavedEventsSection
          savedEvents={savedEvents}
          isLoading={isSavedEventsLoading}
          isFavorited={isFavorited}
          onFavoriteToggle={handleFavoriteToggle}
        />
      </Stack>
    </Page>
  )
}
