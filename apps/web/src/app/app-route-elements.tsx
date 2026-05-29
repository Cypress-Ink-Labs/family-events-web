import { Navigate, useLocation } from "react-router"
import { useAuth } from "@/features/auth/stores/auth-store"
import { HOME_PATH } from "@/shared/access-control"
import { DashboardPage, MarketingPage, SaturdayPlanPage } from "@/app/app-route-pages"

/** Logged-in users land on Plan; anonymous users land on the public homepage. */
export function RootRedirect() {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (user) return <Navigate to={HOME_PATH} replace />

  return <MarketingPage />
}

export function HomeRoute() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  if (searchParams.get("legacy") === "1") {
    return <DashboardPage />
  }

  return <SaturdayPlanPage />
}
