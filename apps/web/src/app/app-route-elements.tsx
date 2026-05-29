import { useLocation } from "react-router"
import { AppLayout } from "@/app/layouts/app-layout"
import { DashboardPage, MarketingPage, SaturdayPlanPage } from "@/app/app-route-pages"

export function RootLandingRoute() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const showLegacyHome = searchParams.get("legacy") === "1"

  if (!showLegacyHome) {
    return <MarketingPage />
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
