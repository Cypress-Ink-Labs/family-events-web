import { StaggerItem, StaggerList } from "@/shared/components/motion"
import { EventCardSkeleton } from "@/features/events/components/event-card"

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
