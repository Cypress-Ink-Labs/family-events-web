import { lazy } from "react"

export const DashboardPage = lazy(() =>
  import("@/features/dashboard/pages/dashboard").then((module) => ({
    default: module.DashboardPage,
  }))
)
export const SaturdayPlanPage = lazy(() =>
  import("@/features/plan/pages/saturday-plan").then((module) => ({
    default: module.SaturdayPlanPage,
  }))
)
export const ExplorePage = lazy(() =>
  import("@/features/explore/pages/explore").then((module) => ({
    default: module.ExplorePage,
  }))
)
export const EventDetailPage = lazy(() =>
  import("@/features/events/pages/event-detail").then((module) => ({
    default: module.EventDetailPage,
  }))
)
export const CalendarViewPage = lazy(() =>
  import("@/features/calendar/pages/calendar-view").then((module) => ({
    default: module.CalendarViewPage,
  }))
)
export const MapViewPage = lazy(() =>
  import("@/features/map/pages/map-view").then((module) => ({
    default: module.MapViewPage,
  }))
)
export const MarketingPage = lazy(() =>
  import("@/features/marketing/pages/marketing").then((module) => ({
    default: module.MarketingPage,
  }))
)
export const PublicEventPreviewPage = lazy(() =>
  import("@/features/events/pages/public-event-preview").then((module) => ({
    default: module.PublicEventPreviewPage,
  }))
)
export const PrivacyPage = lazy(() =>
  import("@/features/legal/pages/legal-pages").then((module) => ({
    default: module.PrivacyPage,
  }))
)
export const TermsPage = lazy(() =>
  import("@/features/legal/pages/legal-pages").then((module) => ({
    default: module.TermsPage,
  }))
)
export const MyEventsPage = lazy(() =>
  import("@/features/my-events/pages/my-events").then((module) => ({
    default: module.MyEventsPage,
  }))
)
export const ProfilePage = lazy(() =>
  import("@/features/profile/pages/profile").then((module) => ({
    default: module.ProfilePage,
  }))
)

export const SignInPage = lazy(() =>
  import("@/features/auth/pages/sign-in").then((module) => ({
    default: module.SignInPage,
  }))
)
export const SignUpPage = lazy(() =>
  import("@/features/auth/pages/sign-up").then((module) => ({
    default: module.SignUpPage,
  }))
)
export const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/pages/forgot-password").then((module) => ({
    default: module.ForgotPasswordPage,
  }))
)
export const ResetPasswordPage = lazy(() =>
  import("@/features/auth/pages/reset-password").then((module) => ({
    default: module.ResetPasswordPage,
  }))
)
export const OAuthCallbackPage = lazy(() =>
  import("@/features/auth/pages/oauth-callback").then((module) => ({
    default: module.OAuthCallbackPage,
  }))
)

export const AdminDashboardPage = lazy(() =>
  import("@/features/admin/pages/admin-dashboard").then((module) => ({
    default: module.AdminDashboardPage,
  }))
)
export const AdminSourcesPage = lazy(() =>
  import("@/features/admin/pages/admin-sources").then((module) => ({
    default: module.AdminSourcesPage,
  }))
)
export const AdminEventsPage = lazy(() =>
  import("@/features/admin/pages/admin-events").then((module) => ({
    default: module.AdminEventsPage,
  }))
)
export const AdminEventEditPage = lazy(() =>
  import("@/features/admin/pages/admin-event-edit").then((module) => ({
    default: module.AdminEventEditPage,
  }))
)
export const AdminCitiesPage = lazy(() =>
  import("@/features/admin/pages/admin-cities").then((module) => ({
    default: module.AdminCitiesPage,
  }))
)
export const AdminCommentsPage = lazy(() =>
  import("@/features/admin/pages/admin-comments").then((module) => ({
    default: module.AdminCommentsPage,
  }))
)
export const AdminRatingsPage = lazy(() =>
  import("@/features/admin/pages/admin-ratings").then((module) => ({
    default: module.AdminRatingsPage,
  }))
)
export const AdminAccessPage = lazy(() =>
  import("@/features/admin/pages/admin-access").then((module) => ({
    default: module.AdminAccessPage,
  }))
)
export const AdminInvitesPage = lazy(() =>
  import("@/features/admin/pages/admin-invites").then((module) => ({
    default: module.AdminInvitesPage,
  }))
)
export const AdminLogsPage = lazy(() =>
  import("@/features/admin/pages/admin-logs").then((module) => ({
    default: module.AdminLogsPage,
  }))
)
export const AdminCronsPage = lazy(() =>
  import("@/features/admin/pages/admin-crons").then((module) => ({
    default: module.AdminCronsPage,
  }))
)
export const AdminSettingsPage = lazy(() =>
  import("@/features/admin/pages/admin-settings").then((module) => ({
    default: module.AdminSettingsPage,
  }))
)
