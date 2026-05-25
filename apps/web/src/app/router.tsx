import { lazy, Suspense } from "react"
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from "react-router"
import { AppErrorBoundary } from "@/app/app-error-boundary"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { PublicOnlyRoute } from "@/features/auth/components/public-only-route"
import { AppLayout } from "@/app/layouts/app-layout"
import { AdminLayout } from "@/app/layouts/admin-layout"
import { useAuth } from "@/features/auth/stores/auth-store"
import { HOME_PATH } from "@/shared/access-control"
import { FadeSwap } from "@/shared/components/motion"

const DashboardPage = lazy(() =>
  import("@/features/dashboard/pages/dashboard").then((module) => ({
    default: module.DashboardPage,
  }))
)
const SaturdayPlanPage = lazy(() =>
  import("@/features/plan/pages/saturday-plan").then((module) => ({
    default: module.SaturdayPlanPage,
  }))
)
const ExplorePage = lazy(() =>
  import("@/features/explore/pages/explore").then((module) => ({
    default: module.ExplorePage,
  }))
)
const EventDetailPage = lazy(() =>
  import("@/features/events/pages/event-detail").then((module) => ({
    default: module.EventDetailPage,
  }))
)
const CalendarViewPage = lazy(() =>
  import("@/features/calendar/pages/calendar-view").then((module) => ({
    default: module.CalendarViewPage,
  }))
)
const MapViewPage = lazy(() =>
  import("@/features/map/pages/map-view").then((module) => ({
    default: module.MapViewPage,
  }))
)
const MarketingPage = lazy(() =>
  import("@/features/marketing/pages/marketing").then((module) => ({
    default: module.MarketingPage,
  }))
)
const PublicEventPreviewPage = lazy(() =>
  import("@/features/events/pages/public-event-preview").then((module) => ({
    default: module.PublicEventPreviewPage,
  }))
)
const MyEventsPage = lazy(() =>
  import("@/features/my-events/pages/my-events").then((module) => ({
    default: module.MyEventsPage,
  }))
)
const ProfilePage = lazy(() =>
  import("@/features/profile/pages/profile").then((module) => ({
    default: module.ProfilePage,
  }))
)

const SignInPage = lazy(() =>
  import("@/features/auth/pages/sign-in").then((module) => ({
    default: module.SignInPage,
  }))
)
const SignUpPage = lazy(() =>
  import("@/features/auth/pages/sign-up").then((module) => ({
    default: module.SignUpPage,
  }))
)
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth/pages/forgot-password").then((module) => ({
    default: module.ForgotPasswordPage,
  }))
)
const ResetPasswordPage = lazy(() =>
  import("@/features/auth/pages/reset-password").then((module) => ({
    default: module.ResetPasswordPage,
  }))
)
const OAuthCallbackPage = lazy(() =>
  import("@/features/auth/pages/oauth-callback").then((module) => ({
    default: module.OAuthCallbackPage,
  }))
)

const AdminDashboardPage = lazy(() =>
  import("@/features/admin/pages/admin-dashboard").then((module) => ({
    default: module.AdminDashboardPage,
  }))
)
const AdminSourcesPage = lazy(() =>
  import("@/features/admin/pages/admin-sources").then((module) => ({
    default: module.AdminSourcesPage,
  }))
)
const AdminEventsPage = lazy(() =>
  import("@/features/admin/pages/admin-events").then((module) => ({
    default: module.AdminEventsPage,
  }))
)
const AdminEventEditPage = lazy(() =>
  import("@/features/admin/pages/admin-event-edit").then((module) => ({
    default: module.AdminEventEditPage,
  }))
)
const AdminCitiesPage = lazy(() =>
  import("@/features/admin/pages/admin-cities").then((module) => ({
    default: module.AdminCitiesPage,
  }))
)
const AdminCommentsPage = lazy(() =>
  import("@/features/admin/pages/admin-comments").then((module) => ({
    default: module.AdminCommentsPage,
  }))
)
const AdminRatingsPage = lazy(() =>
  import("@/features/admin/pages/admin-ratings").then((module) => ({
    default: module.AdminRatingsPage,
  }))
)
const AdminAccessPage = lazy(() =>
  import("@/features/admin/pages/admin-access").then((module) => ({
    default: module.AdminAccessPage,
  }))
)
const AdminInvitesPage = lazy(() =>
  import("@/features/admin/pages/admin-invites").then((module) => ({
    default: module.AdminInvitesPage,
  }))
)
const AdminLogsPage = lazy(() =>
  import("@/features/admin/pages/admin-logs").then((module) => ({
    default: module.AdminLogsPage,
  }))
)
const AdminCronsPage = lazy(() =>
  import("@/features/admin/pages/admin-crons").then((module) => ({
    default: module.AdminCronsPage,
  }))
)
const AdminSettingsPage = lazy(() =>
  import("@/features/admin/pages/admin-settings").then((module) => ({
    default: module.AdminSettingsPage,
  }))
)

function RouteFallback() {
  return (
    <FadeSwap stateKey="route-fallback">
      <div className="min-h-[50vh] bg-background px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-36 animate-pulse rounded-lg border bg-card" />
            <div className="h-36 animate-pulse rounded-lg border bg-card" />
            <div className="h-36 animate-pulse rounded-lg border bg-card" />
          </div>
        </div>
      </div>
    </FadeSwap>
  )
}

function RootLandingRoute() {
  const location = useLocation()
  const { user, isEnabled, isLoading } = useAuth()
  const searchParams = new URLSearchParams(location.search)
  const showLegacyHome = searchParams.get("legacy") === "1"

  if (!showLegacyHome) {
    return <MarketingPage />
  }

  if (isLoading) {
    return <RouteFallback />
  }

  if (!user || !isEnabled) {
    return <Navigate to="/sign-in" replace state={{ from: `${HOME_PATH}?legacy=1` }} />
  }

  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  )
}

function HomeRoute() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  if (searchParams.get("legacy") === "1") {
    return <DashboardPage />
  }

  return <SaturdayPlanPage />
}

function RootLayout() {
  return (
    <AppErrorBoundary>
      <ScrollRestoration />
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </AppErrorBoundary>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <RootLandingRoute /> },
      { path: "/share/:eventId", element: <PublicEventPreviewPage /> },

      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "/sign-in", element: <SignInPage /> },
          { path: "/sign-up", element: <SignUpPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },

      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/auth/callback", element: <OAuthCallbackPage /> },

      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: HOME_PATH, element: <HomeRoute /> },
              { path: "/explore", element: <ExplorePage /> },
              { path: "/map", element: <MapViewPage /> },
              { path: "/events/:id", element: <EventDetailPage /> },
              { path: "/calendar", element: <CalendarViewPage /> },
              { path: "/saved", element: <MyEventsPage /> },
              { path: "/profile", element: <ProfilePage /> },
            ],
          },
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: "sources", element: <AdminSourcesPage /> },
              { path: "events", element: <AdminEventsPage /> },
              { path: "events/:eventId/edit", element: <AdminEventEditPage /> },
              { path: "cities", element: <AdminCitiesPage /> },
              { path: "comments", element: <AdminCommentsPage /> },
              { path: "ratings", element: <AdminRatingsPage /> },
              { path: "access", element: <AdminAccessPage /> },
              { path: "invites", element: <AdminInvitesPage /> },
              { path: "logs", element: <AdminLogsPage /> },
              { path: "crons", element: <AdminCronsPage /> },
              { path: "settings", element: <AdminSettingsPage /> },
            ],
          },
        ],
      },

      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])
