/**
 * Back-compat barrel for dashboard sections. Each component now lives in
 * its own file under `./dashboard/`. Import directly from those paths in
 * new code.
 */

export { DashboardHeader } from "@/features/dashboard/components/dashboard/dashboard-header"
export {
  DashboardEmptyState,
  DashboardErrorState,
  DashboardLoadingState,
} from "@/features/dashboard/components/dashboard/dashboard-states"
export { DashboardTodaySection } from "@/features/dashboard/components/dashboard/dashboard-today-section"
export { DashboardCarouselSection } from "@/features/dashboard/components/dashboard/dashboard-carousel-section"
export { DashboardSoonSection } from "@/features/dashboard/components/dashboard/dashboard-soon-section"
export { DashboardSavedSection } from "@/features/dashboard/components/dashboard/dashboard-saved-section"
export { DashboardParentPulse } from "@/features/dashboard/components/dashboard/dashboard-parent-pulse"
export { DashboardGuestCta } from "@/features/dashboard/components/dashboard/dashboard-guest-cta"
