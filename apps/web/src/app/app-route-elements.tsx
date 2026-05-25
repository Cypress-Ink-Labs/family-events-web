import { Navigate, useLocation } from "react-router"
import { AppLayout } from "@/app/layouts/app-layout"
import { useAuth } from "@/features/auth/stores/auth-store"
import { HOME_PATH } from "@/shared/access-control"
import { DashboardPage, MarketingPage, SaturdayPlanPage } from "@/app/app-route-pages"
import { RouteFallback } from "@/app/route-fallback"

export function RootLandingRoute() {
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

export function HomeRoute() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  if (searchParams.get("legacy") === "1") {
    return <DashboardPage />
  }

  return <SaturdayPlanPage />
}
