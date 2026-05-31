/**
 * Back-compat barrel for event-detail sections. Each component now lives in
 * its own file in this same directory. Import directly from those paths in
 * new code.
 */

export { EventDetailLoadingState } from "@/features/events/components/event-detail/loading-state"
export { EventDetailErrorState } from "@/features/events/components/event-detail/error-state"
export { EventDetailHero } from "@/features/events/components/event-detail/hero"
export { EventDetailSectionLayout } from "@/features/events/components/event-detail/section-layout"
export { EventDetailSummary } from "@/features/events/components/event-detail/summary"
export { EventDetailInfoGrid } from "@/features/events/components/event-detail/info-grid"
export { EventDetailAbout } from "@/features/events/components/event-detail/about"
export { EventDetailLocation } from "@/features/events/components/event-detail/location"
export { EventDetailBooking } from "@/features/events/components/event-detail/booking"
export { EventDetailReviews } from "@/features/events/components/event-detail/reviews"
export { SimilarEventsSection } from "@/features/events/components/event-detail/similar-events"
