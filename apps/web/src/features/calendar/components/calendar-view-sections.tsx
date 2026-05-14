import { format, isSameDay, isToday } from "date-fns"
import { Bookmark, CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react"
import { Link } from "react-router-dom"

import type { EventWithDetails } from "@/lib/types"

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const
import { cn } from "@/lib/utils"
import { EventCard, EventCardSkeleton } from "@/features/events/components/event-card"
import { FadeSwap, StaggerItem, StaggerList } from "@/components/motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PageHeaderProps {
  view: "month" | "week"
  onViewChange: (view: "month" | "week") => void
}

export function CalendarErrorState() {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        We couldn&apos;t load calendar events right now.
      </CardContent>
    </Card>
  )
}

export function CalendarViewHeader({ view, onViewChange }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Calendar
        </p>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Your Adventures</h1>
      </div>
      <Tabs value={view} onValueChange={(nextView) => onViewChange(nextView as "month" | "week")}>
        <TabsList className="h-9">
          <TabsTrigger value="month" className="text-xs gap-1.5 px-3">
            <CalendarDays className="size-3.5" />
            Month
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs gap-1.5 px-3">
            <List className="size-3.5" />
            Week
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}

interface CalendarWeekPanelProps {
  weekDays: Date[]
  selectedDate: Date
  onPreviousWeek: () => void
  onNextWeek: () => void
  onSelectDate: (date: Date) => void
  getEventsForDay: (date: Date) => EventWithDetails[]
}

export function CalendarWeekPanel({
  weekDays,
  selectedDate,
  onPreviousWeek,
  onNextWeek,
  onSelectDate,
  getEventsForDay,
}: CalendarWeekPanelProps) {
  const weekStart = weekDays[0]
  const weekEnd = weekDays[weekDays.length - 1]
  const weekLabel =
    format(weekStart, "MMM d") +
    (format(weekStart, "MMM") === format(weekEnd, "MMM")
      ? ` – ${format(weekEnd, "d, yyyy")}`
      : ` – ${format(weekEnd, "MMM d, yyyy")}`)

  return (
    <div className="lg:col-span-3 space-y-3">
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={onPreviousWeek}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-base font-semibold text-foreground tracking-tight">{weekLabel}</h2>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((dayLabel) => (
              <div
                key={dayLabel}
                className="text-center text-[11px] font-semibold text-muted-foreground py-2"
              >
                {dayLabel}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isSelected = isSameDay(day, selectedDate)
              const isTodayDay = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "relative flex flex-col items-center justify-center h-14 rounded-xl text-sm transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : isTodayDay
                        ? "text-primary font-semibold ring-2 ring-primary/30 ring-inset hover:bg-primary/8"
                        : "hover:bg-accent text-foreground"
                  )}
                >
                  <span className="text-xs text-inherit opacity-60 leading-none mb-0.5">
                    {format(day, "EEE")}
                  </span>
                  <span className="leading-none font-semibold">{format(day, "d")}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "size-1 rounded-full",
                            isSelected
                              ? "bg-primary-foreground/60"
                              : isTodayDay
                                ? "bg-primary"
                                : "bg-muted-foreground/50"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 px-1">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-muted-foreground/40" />
          <span className="text-xs text-muted-foreground">Has events</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded-full ring-2 ring-primary/40 ring-inset" />
          <span className="text-xs text-muted-foreground">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Selected</span>
        </div>
      </div>
    </div>
  )
}

interface CalendarGridPanelProps {
  currentMonth: Date
  days: Date[]
  firstDayOfWeek: number
  selectedDate: Date
  onPreviousMonth: () => void
  onNextMonth: () => void
  onSelectDate: (date: Date) => void
  getEventsForDay: (date: Date) => EventWithDetails[]
}

export function CalendarMonthPanel({
  currentMonth,
  days,
  firstDayOfWeek,
  selectedDate,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
  getEventsForDay,
}: CalendarGridPanelProps) {
  return (
    <div className="lg:col-span-3 space-y-3">
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={onPreviousMonth}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-base font-semibold text-foreground tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((dayLabel) => (
              <div
                key={dayLabel}
                className="text-center text-[11px] font-semibold text-muted-foreground py-2"
              >
                {dayLabel}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}
            {days.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isSelected = isSameDay(day, selectedDate)
              const isTodayDay = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "relative flex flex-col items-center justify-center h-11 rounded-xl text-sm transition-all group",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : isTodayDay
                        ? "text-primary font-semibold ring-2 ring-primary/30 ring-inset hover:bg-primary/8"
                        : "hover:bg-accent text-foreground"
                  )}
                >
                  <span className="leading-none">{format(day, "d")}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "size-1 rounded-full",
                            isSelected
                              ? "bg-primary-foreground/60"
                              : isTodayDay
                                ? "bg-primary"
                                : "bg-muted-foreground/50"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 px-1">
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-muted-foreground/40" />
          <span className="text-xs text-muted-foreground">Has events</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded-full ring-2 ring-primary/40 ring-inset" />
          <span className="text-xs text-muted-foreground">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Selected</span>
        </div>
      </div>
    </div>
  )
}

interface SelectedDateEventsCardProps {
  selectedDate: Date
  events: EventWithDetails[]
  isLoading: boolean
  isFavorited: (eventId: string) => boolean
  onFavoriteToggle: (eventId: string, nextState: boolean) => void
}

export function CalendarSelectedDatePanel({
  selectedDate,
  events,
  isLoading,
  isFavorited,
  onFavoriteToggle,
}: SelectedDateEventsCardProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-sm">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
          </h3>
          <p className="text-xs text-muted-foreground">{format(selectedDate, "MMMM d, yyyy")}</p>
        </div>
        {events.length > 0 && (
          <Badge variant="secondary" className="text-xs font-semibold">
            {events.length} {events.length === 1 ? "event" : "events"}
          </Badge>
        )}
      </div>

      <FadeSwap
        stateKey={
          isLoading
            ? "calendar-selected-loading"
            : events.length === 0
              ? "calendar-selected-empty"
              : "calendar-selected-content"
        }
      >
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <EventCardSkeleton key={`calendar-skeleton-${index}`} variant="compact" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nothing planned</p>
            <p className="text-xs text-muted-foreground mb-4">No events on this day</p>
            <Button variant="outline" size="sm" className="text-xs h-8" asChild>
              <Link to="/explore">Browse events</Link>
            </Button>
          </div>
        ) : (
          <StaggerList className="divide-y divide-border/40">
            {events.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard
                  event={{ ...event, is_favorited: isFavorited(event.id) }}
                  variant="compact"
                  onFavoriteToggle={onFavoriteToggle}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </FadeSwap>
    </div>
  )
}

interface StatsCardsProps {
  savedCount: number
  upcomingCount: number
}

export function CalendarStatsPanel({ savedCount, upcomingCount }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-card border border-border/60 rounded-2xl p-4 text-center shadow-sm">
        <div className="flex items-center justify-center mb-1">
          <Bookmark className="size-4 text-primary" />
        </div>
        <p className="text-2xl font-extrabold text-primary leading-none">{savedCount}</p>
        <p className="text-[11px] text-muted-foreground mt-1 font-medium">Saved</p>
      </div>
      <div className="bg-card border border-border/60 rounded-2xl p-4 text-center shadow-sm">
        <div className="flex items-center justify-center mb-1">
          <CalendarDays className="size-4 text-primary" />
        </div>
        <p className="text-2xl font-extrabold text-primary leading-none">{upcomingCount}</p>
        <p className="text-[11px] text-muted-foreground mt-1 font-medium">Upcoming</p>
      </div>
    </div>
  )
}

interface SavedEventsSectionProps {
  savedEvents: EventWithDetails[]
  isLoading: boolean
  isFavorited: (eventId: string) => boolean
  onFavoriteToggle: (eventId: string, nextState: boolean) => void
}

export function SavedEventsSection({
  savedEvents,
  isLoading,
  isFavorited,
  onFavoriteToggle,
}: SavedEventsSectionProps) {
  return (
    <section>
      <Separator className="mb-6" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Saved Events</h2>
        <span className="text-sm text-muted-foreground">{savedEvents.length} saved</span>
      </div>
      <FadeSwap
        stateKey={
          isLoading
            ? "calendar-saved-loading"
            : savedEvents.length === 0
              ? "calendar-saved-empty"
              : "calendar-saved-content"
        }
      >
        {isLoading ? (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <StaggerItem key={`saved-events-skeleton-${index}`}>
                <EventCardSkeleton />
              </StaggerItem>
            ))}
          </StaggerList>
        ) : savedEvents.length === 0 ? (
          <div className="py-16 text-center">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Bookmark className="size-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No saved events yet</h3>
            <p className="text-muted-foreground text-sm mb-5">
              Browse events and tap the heart to save them here.
            </p>
            <Button asChild>
              <Link to="/explore">Explore Events</Link>
            </Button>
          </div>
        ) : (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedEvents.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard
                  event={{ ...event, is_favorited: isFavorited(event.id) }}
                  variant="default"
                  onFavoriteToggle={onFavoriteToggle}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </FadeSwap>
    </section>
  )
}
