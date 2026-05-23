/**
 * Back-compat barrel for the calendar view sections. Each component now
 * lives in its own file under `./calendar-view/`. Import directly from
 * those paths in new code; this barrel keeps the page imports stable.
 */

export { CalendarErrorState } from "@/features/calendar/components/calendar-view/calendar-error-state"
export { CalendarViewHeader } from "@/features/calendar/components/calendar-view/calendar-view-header"
export { CalendarWeekPanel } from "@/features/calendar/components/calendar-view/calendar-week-panel"
export { CalendarMonthPanel } from "@/features/calendar/components/calendar-view/calendar-month-panel"
export { CalendarSelectedDatePanel } from "@/features/calendar/components/calendar-view/calendar-selected-date-panel"
export { CalendarStatsPanel } from "@/features/calendar/components/calendar-view/calendar-stats-panel"
export { SavedEventsSection } from "@/features/calendar/components/calendar-view/saved-events-section"
