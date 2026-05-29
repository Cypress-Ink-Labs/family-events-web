import { useLocation } from "react-router"
import { DashboardPage, SaturdayPlanPage } from "@/app/app-route-pages"

export function HomeRoute() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  if (searchParams.get("legacy") === "1") {
    return <DashboardPage />
  }

  return <SaturdayPlanPage />
}
