import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { City, Event } from "@/shared/types"
import { AdminVirtualEventRow } from "@/features/admin/components/admin-events-list/admin-virtual-event-row"
import { AdminEventsListLoaderRow } from "@/features/admin/components/admin-events-list/admin-events-list-loader-row"

export interface EventsListQueryState {
  hasNextPage: boolean
  isLoading: boolean
  isError: boolean
  error?: unknown
  isFetchingNextPage: boolean
}

interface EventsListProps {
  events: Event[]
  selectedIds: Set<string>
  statusConfig: Record<Event["status"], { label: string; color: string }>
  cities: City[]
  queryState: EventsListQueryState
  onFetchNextPage: () => void
  onRetry: () => void
  onToggleSelect: (id: string) => void
  onOpenReview: (event: Event) => void
  onUpdateStatus: (id: string, status: Event["status"]) => void
}

export function AdminEventsList(props: EventsListProps) {
  return <AdminVirtualEventsList {...props} />
}

export function AdminVirtualEventsList({
  events,
  selectedIds,
  statusConfig,
  cities,
  queryState,
  onFetchNextPage,
  onRetry,
  onToggleSelect,
  onOpenReview,
  onUpdateStatus,
}: EventsListProps) {
  const { hasNextPage, isLoading, isError, error, isFetchingNextPage } = queryState
  const cityNames = new Map(cities.map((city) => [city.id, city.name]))

  const hasLoader = hasNextPage
  const count = events.length + (hasLoader ? 1 : 0)
  const virtualizer = useWindowVirtualizer({
    count,
    estimateSize: () => 112,
    overscan: 12,
    measureElement: (element) => element?.getBoundingClientRect().height ?? 0,
  })

  const virtualRows = virtualizer.getVirtualItems()
  const loaderIndex = hasLoader ? events.length : null

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="admin-events-list-loading">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl border border-border/60 p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-3 h-3 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/3" />
            <Skeleton className="mt-3 h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        <p>{error instanceof Error ? error.message : "Unable to load admin events."}</p>
        <Button size="sm" className="mt-2" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          No events match these filters.
        </div>
      ) : (
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          <div className="absolute left-0 top-0 w-full">
            {virtualRows.map((virtualRow) => {
              if (hasLoader && virtualRow.index === loaderIndex) {
                return (
                  <AdminEventsListLoaderRow
                    key="admin-events-loader-row"
                    virtualRow={virtualRow}
                    measureElement={(element) => {
                      void virtualizer.measureElement(element)
                    }}
                    isFetchingNextPage={isFetchingNextPage}
                    onFetchNextPage={onFetchNextPage}
                  />
                )
              }

              const event = events[virtualRow.index]
              if (!event) return null

              const cityName = event.city_id
                ? (cityNames.get(event.city_id) ?? "Unknown city")
                : "Unassigned"

              return (
                <article
                  key={event.id}
                  ref={(element) => {
                    void virtualizer.measureElement(element)
                  }}
                  data-index={virtualRow.index}
                  className="w-full"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    paddingBottom: "0.75rem",
                  }}
                >
                  <AdminVirtualEventRow
                    event={event}
                    cityName={cityName}
                    statusConfig={statusConfig}
                    isSelected={selectedIds.has(event.id)}
                    onToggleSelect={onToggleSelect}
                    onOpenReview={onOpenReview}
                    onUpdateStatus={onUpdateStatus}
                  />
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
