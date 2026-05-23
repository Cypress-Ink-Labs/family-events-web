import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { StaggerItem, StaggerList } from "@/shared/components/motion"
import { EventCardSkeleton } from "@/features/events/components/event-card"

export function DashboardErrorState() {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        We couldn&apos;t load events right now. Please refresh to try again.
      </CardContent>
    </Card>
  )
}

export function DashboardLoadingState() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Loading events</h2>
      </div>
      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <StaggerItem key={`dashboard-skeleton-${index}`}>
            <EventCardSkeleton />
          </StaggerItem>
        ))}
      </StaggerList>
    </section>
  )
}

export function DashboardEmptyState() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-8 text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">No events yet in this city</h2>
        <p className="text-sm text-muted-foreground">
          We are still importing local family events. Try exploring another city or check back soon.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/explore">Explore</Link>
          </Button>
          <Button asChild>
            <Link to="/profile">Change city</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
