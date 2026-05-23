import { format, isSameDay, isToday } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/format"
import type { EventWithDetails } from "@/shared/types"
import { WEEKDAY_LABELS } from "@/features/calendar/components/calendar-view/_shared"

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
