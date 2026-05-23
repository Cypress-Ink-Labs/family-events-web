import { useCallback } from "react"
import { useWindowVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { Bot, Check, Eye, Pencil, Tag, X, XCircle } from "lucide-react"
import { Link } from "react-router-dom"
import type { City, Event } from "@/lib/types"
import { safeImageSrc } from "@/lib/platform/safe-url"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClientDate } from "@/components/client-date"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { AgeRangeBadge } from "@/features/events/components/tag-badge"
import { formatProviderLabel } from "@/features/admin/utils/format-provider-label"

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

export function AdminEventsList({
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
  return (
    <AdminVirtualEventsList
      events={events}
      selectedIds={selectedIds}
      statusConfig={statusConfig}
      cities={cities}
      queryState={queryState}
      onFetchNextPage={onFetchNextPage}
      onRetry={onRetry}
      onToggleSelect={onToggleSelect}
      onOpenReview={onOpenReview}
      onUpdateStatus={onUpdateStatus}
    />
  )
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
              if (!event) {
                return null
              }

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

interface EventCardProps {
  event: Event
  cityName: string
  isSelected: boolean
  statusConfig: Record<Event["status"], { label: string; color: string }>
  onToggleSelect: (id: string) => void
  onOpenReview: (event: Event) => void
  onUpdateStatus: (id: string, status: Event["status"]) => void
}

function AdminVirtualEventRow({
  event,
  cityName,
  isSelected,
  statusConfig,
  onToggleSelect,
  onOpenReview,
  onUpdateStatus,
}: EventCardProps) {
  const imageUrl = safeImageSrc(event.images?.[0])
  const status = statusConfig[event.status]

  const providerLabel = formatProviderLabel(event.ai_tag_provider)
  const aiConfidence =
    event.ai_confidence == null ? null : `${Math.round(event.ai_confidence * 100)}%`
  const llmConfidence =
    event.llm_review_confidence == null ? null : Number(event.llm_review_confidence).toFixed(2)
  const llmBadge =
    event.llm_review_status && event.llm_review_status !== "not_required"
      ? {
          text:
            event.llm_review_status === "failed"
              ? "LLM failed"
              : event.llm_review_decision === "approve"
                ? `LLM approved${llmConfidence ? ` · ${llmConfidence}` : ""}`
                : event.llm_review_decision === "reject"
                  ? `LLM rejected${llmConfidence ? ` · ${llmConfidence}` : ""}`
                  : `Needs review${llmConfidence ? ` · ${llmConfidence}` : ""}`,
          className:
            event.llm_review_status === "failed"
              ? "text-destructive border-destructive/30 bg-destructive/10"
              : event.llm_review_decision === "approve"
                ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                : event.llm_review_decision === "reject"
                  ? "text-rose-700 border-rose-200 bg-rose-50 dark:text-rose-300 dark:border-rose-900/40 dark:bg-rose-950/30"
                  : "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-900/40 dark:bg-amber-950/30",
        }
      : null

  return (
    <article
      className={cn(
        "rounded-xl border border-border/60 bg-background p-3 transition-colors",
        isSelected && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex gap-3 items-start">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(event.id)}
          className="mt-1 shrink-0"
          aria-label={`Select ${event.title}`}
        />
        <div className="size-14 rounded-lg overflow-hidden shrink-0 bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={event.title}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-foreground leading-tight flex-1">
              {event.title}
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {cityName}
            </Badge>
            <span
              className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", status.color)}
            >
              {status.label}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span>
              <ClientDate value={event.start_datetime} pattern="MMM d, h:mm a" />
            </span>
            <span>{event.venue_name ?? "No venue"}</span>
          </div>

          {event.status === "draft" && (
            <>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Bot className="size-3" />
                  <span>
                    {providerLabel}
                    {event.ai_tag_model ? ` • ${event.ai_tag_model}` : ""}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Tag className="size-3" />
                  {aiConfidence ? `Confidence ${aiConfidence}` : "Confidence n/a"}
                </span>
                <span
                  className={cn(
                    "rounded-full border border-border px-2 py-0.5 text-[10px]",
                    event.ai_tag_status === "success" ? "text-emerald-700" : "text-amber-600"
                  )}
                >
                  AI {event.ai_tag_status ?? "pending"}
                </span>
                {llmBadge ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      llmBadge.className
                    )}
                    title={event.llm_review_reason ?? undefined}
                  >
                    {llmBadge.text}
                  </span>
                ) : null}
              </div>
              {event.llm_review_status === "failed" ||
              event.llm_review_decision === "needs_admin_review" ? (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {event.llm_review_error ?? event.llm_review_reason ?? "Routed to admin review"}
                </p>
              ) : null}
            </>
          )}

          <div className="flex items-center gap-1.5">
            <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="ghost" size="icon" aria-label="Edit event" className="size-9" asChild>
              <Link to={`/admin/events/${event.id}/edit`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Review event"
              className="size-9"
              onClick={() => onOpenReview(event)}
            >
              <Eye className="size-4" />
            </Button>
            {event.status === "draft" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Publish event"
                  className="size-9 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20"
                  onClick={() => onUpdateStatus(event.id, "published")}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reject event"
                  className="size-9 text-destructive hover:bg-destructive/10"
                  onClick={() => onUpdateStatus(event.id, "rejected")}
                >
                  <X className="size-4" />
                </Button>
              </>
            )}
            {event.status === "published" && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Archive event"
                className="size-9 text-destructive hover:bg-destructive/10"
                onClick={() => onUpdateStatus(event.id, "archived")}
              >
                <XCircle className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

interface AdminEventsListLoaderRowProps {
  virtualRow: VirtualItem
  measureElement: (element: Element | null) => void
  isFetchingNextPage: boolean
  onFetchNextPage: () => void
}

function AdminEventsListLoaderRow({
  virtualRow,
  measureElement,
  isFetchingNextPage,
  onFetchNextPage,
}: AdminEventsListLoaderRowProps) {
  const triggerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        measureElement(node)
        if (!isFetchingNextPage) {
          onFetchNextPage()
        }
      }
    },
    [measureElement, isFetchingNextPage, onFetchNextPage]
  )

  return (
    <div
      key="admin-events-loader-row"
      ref={triggerRef}
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
      <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
        {isFetchingNextPage ? "Loading next events..." : "Load more events available."}
      </div>
    </div>
  )
}
