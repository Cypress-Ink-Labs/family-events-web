import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/app/providers/theme-provider"
import { AppErrorBoundary } from "@/app/app-error-boundary"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { PublicOnlyRoute } from "@/features/auth/components/public-only-route"
import { useAuth, useAuthStore } from "@/features/auth/stores/auth-store"
import { Toaster } from "@/components/ui/sonner"
import { HOME_PATH } from "@/lib/access-control"
import { queryClient } from "@/infrastructure/queries/query-client"
import { AppMotionProvider, FadeSwap } from "@/components/motion"

import { AppLayout } from "@/app/layouts/app-layout"
import { AdminLayout } from "@/app/layouts/admin-layout"

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

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((module) => ({
        default: module.ReactQueryDevtools,
      }))
    )
  : null

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

function AuthInit() {
  useEffect(() => {
    const cleanup = useAuthStore.getState().initAuth()
    return cleanup
  }, [])
  return null
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

export default function App() {
  return (
    <ThemeProvider storageKey="family-events-theme">
      <QueryClientProvider client={queryClient}>
        <AuthInit />
        <AppMotionProvider>
          <BrowserRouter>
            <AppErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route index element={<RootLandingRoute />} />
                  <Route path="/share/:eventId" element={<PublicEventPreviewPage />} />

                  <Route element={<PublicOnlyRoute />}>
                    <Route path="/sign-in" element={<SignInPage />} />
                    <Route path="/sign-up" element={<SignUpPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  </Route>

                  {/* /reset-password and /auth/callback live outside PublicOnlyRoute because
                      they are the landing point of a redirect that may carry a fresh session. */}
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/auth/callback" element={<OAuthCallbackPage />} />

                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path={HOME_PATH} element={<HomeRoute />} />
                      <Route path="/explore" element={<ExplorePage />} />
                      <Route path="/map" element={<MapViewPage />} />
                      <Route path="/events/:id" element={<EventDetailPage />} />
                      <Route path="/calendar" element={<CalendarViewPage />} />
                      <Route path="/saved" element={<MyEventsPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                    </Route>

                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboardPage />} />
                      <Route path="sources" element={<AdminSourcesPage />} />
                      <Route path="events" element={<AdminEventsPage />} />
                      <Route path="events/:eventId/edit" element={<AdminEventEditPage />} />
                      <Route path="cities" element={<AdminCitiesPage />} />
                      <Route path="comments" element={<AdminCommentsPage />} />
                      <Route path="ratings" element={<AdminRatingsPage />} />
                      <Route path="access" element={<AdminAccessPage />} />
                      <Route path="invites" element={<AdminInvitesPage />} />
                      <Route path="logs" element={<AdminLogsPage />} />
                      <Route path="crons" element={<AdminCronsPage />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </AppErrorBoundary>
          </BrowserRouter>
        </AppMotionProvider>
        <Toaster richColors position="bottom-right" />
        {ReactQueryDevtools ? (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
