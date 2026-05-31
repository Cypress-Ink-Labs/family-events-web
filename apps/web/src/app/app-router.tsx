import { Suspense } from "react"
import { createBrowserRouter, Navigate, Outlet } from "react-router"
import { AppErrorBoundary } from "@/app/app-error-boundary"
import { ScrollToTop } from "@/app/scroll-to-top"
import { AdminLayout } from "@/app/layouts/admin-layout"
import { AppLayout } from "@/app/layouts/app-layout"
import { HomeRoute, RootRedirect } from "@/app/app-route-elements"
import {
  AdminAccessPage,
  AdminCitiesPage,
  AdminCommentsPage,
  AdminCronsPage,
  AdminDashboardPage,
  AdminEventEditPage,
  AdminEventsPage,
  AdminInvitesPage,
  AdminLogsPage,
  AdminRatingsPage,
  AdminSettingsPage,
  AdminSourcesPage,
  CalendarViewPage,
  EventDetailPage,
  ExplorePage,
  ForgotPasswordPage,
  MapViewPage,
  MyEventsPage,
  OAuthCallbackPage,
  ProfilePage,
  PrivacyPage,
  PublicEventPreviewPage,
  ResetPasswordPage,
  SignInPage,
  SignUpPage,
  TermsPage,
} from "@/app/app-route-pages"
import { RouteFallback } from "@/app/route-fallback"
import { FeatureErrorBoundary } from "@/shared/components/feature-error-boundary"
import { ProtectedRoute } from "@/features/auth/components/protected-route"
import { PublicOnlyRoute } from "@/features/auth/components/public-only-route"
import { HOME_PATH } from "@/shared/access-control"

function AppRouteShell() {
  return (
    <>
      <ScrollToTop />
      <AppErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </AppErrorBoundary>
    </>
  )
}

export const appRouter = createBrowserRouter(
  [
    {
      element: <AppRouteShell />,
      children: [
        { index: true, element: <RootRedirect /> },
        { path: "/share/:eventId", element: <PublicEventPreviewPage /> },
        { path: "/privacy", element: <PrivacyPage /> },
        { path: "/terms", element: <TermsPage /> },

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

        /* Public browse routes — accessible without login */
        {
          element: <AppLayout />,
          children: [
            {
              path: "/explore",
              element: (
                <FeatureErrorBoundary featureName="Explore">
                  <ExplorePage />
                </FeatureErrorBoundary>
              ),
            },
            {
              path: "/map",
              element: (
                <FeatureErrorBoundary featureName="Map">
                  <MapViewPage />
                </FeatureErrorBoundary>
              ),
            },
            {
              path: "/events/:id",
              element: (
                <FeatureErrorBoundary featureName="Event Detail">
                  <EventDetailPage />
                </FeatureErrorBoundary>
              ),
            },
            {
              path: "/calendar",
              element: (
                <FeatureErrorBoundary featureName="Calendar">
                  <CalendarViewPage />
                </FeatureErrorBoundary>
              ),
            },
          ],
        },

        /* Auth-required routes */
        {
          element: <ProtectedRoute />,
          children: [
            {
              element: <AppLayout />,
              children: [
                { path: HOME_PATH, element: <HomeRoute /> },
                {
                  path: "/saved",
                  element: (
                    <FeatureErrorBoundary featureName="Saved Events">
                      <MyEventsPage />
                    </FeatureErrorBoundary>
                  ),
                },
                {
                  path: "/profile",
                  element: (
                    <FeatureErrorBoundary featureName="Profile">
                      <ProfilePage />
                    </FeatureErrorBoundary>
                  ),
                },
              ],
            },
            {
              path: "/admin",
              element: (
                <FeatureErrorBoundary featureName="Admin">
                  <AdminLayout />
                </FeatureErrorBoundary>
              ),
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
  ],
  {
    future: {
      v8_middleware: true,
    },
  }
)
