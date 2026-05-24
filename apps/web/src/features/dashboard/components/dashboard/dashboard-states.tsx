import { Card, CardContent } from "@/shared/components/ui/card"

export { DashboardLoadingState } from "@/features/dashboard/components/dashboard/dashboard-loading-state"
export { DashboardEmptyState } from "@/features/dashboard/components/dashboard/dashboard-empty-state"

export function DashboardErrorState() {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        We couldn&apos;t load events right now. Please refresh to try again.
      </CardContent>
    </Card>
  )
}
