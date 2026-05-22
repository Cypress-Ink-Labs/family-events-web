import { useCallback } from "react"
import { useWindowVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCheck,
  Eye,
  Pencil,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import { Link } from "react-router-dom"
import type {
  City,
  Event,
  EventAiTraceWithParsed,
  EventWithDetails,
  Tag as EventTag,
} from "@/lib/types"
import { safeImageSrc } from "@/lib/safe-url"
import { cn, formatEventPrice } from "@/lib/utils"
import { cleanDescription } from "@family-events/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClientDate } from "@/components/client-date"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { AgeRangeBadge, TagBadge } from "@/features/events/components/tag-badge"
import { FilterBar, FormGrid } from "@/components/v2"
import { formatProviderLabel } from "@/features/admin/utils/format-provider-label"

export type AdminEventStatusFilter = Event["status"] | "all"

export interface EventsListQueryState {
  hasNextPage: boolean
  isLoading: boolean
  isError: boolean
  error?: unknown
  isFetchingNextPage: boolean
}

interface StatusFilterBarProps {
  statusFilter: AdminEventStatusFilter
  counts: Record<string, number>
  total: number
  onChange: (status: AdminEventStatusFilter) => void
}

export function AdminEventStatusFilterBar({
  statusFilter,
  counts,
  total,
  onChange,
}: StatusFilterBarProps) {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-xl font-medium tracking-tight text-foreground md:text-2xl">
        Events
      </h2>
      <FilterBar>
        {(["all", "draft", "published", "rejected"] as const).map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => onChange(status)}
            className={cn(
              "inline-flex min-h-[36px] shrink-0 snap-start items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== "all" && counts[status] ? (
              <span className="opacity-70">({counts[status]})</span>
            ) : status === "all" ? (
              <span className="opacity-70">({total})</span>
            ) : null}
          </button>
        ))}
      </FilterBar>
    </div>
  )
}

interface ToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  loadedCount: number
  totalCount: number
  allLoadedSelected: boolean
  onToggleSelectAll: () => void
}

export function AdminEventsToolbar({
  keyword,
  onKeywordChange,
  loadedCount,
  totalCount,
  allLoadedSelected,
  onToggleSelectAll,
}: ToolbarProps) {
  const buttonLabel = allLoadedSelected
    ? "Deselect loaded"
    : `Select loaded (${loadedCount} of ${totalCount})`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="Search events..."
          className="min-h-[44px] pl-9"
        />
      </div>
      {loadedCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] gap-1.5 text-xs"
          onClick={onToggleSelectAll}
        >
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-3.5 shrink-0 items-center justify-center rounded-md border border-input shadow-xs transition-colors",
              allLoadedSelected && "border-primary bg-primary text-primary-foreground"
            )}
          >
            <Check className="size-3" />
          </span>
          <span className="truncate">{buttonLabel}</span>
        </Button>
      )}
    </div>
  )
}

interface BulkBarProps {
  selectedCount: number
  selectedDraftCount: number
  isStatusPending: boolean
  isDeletePending: boolean
  onPublish: () => void
  onReject: () => void
  onDelete: () => void
  onClear: () => void
}

export function AdminEventsBulkBar({
  selectedCount,
  selectedDraftCount,
  isStatusPending,
  isDeletePending,
  onPublish,
  onReject,
  onDelete,
  onClear,
}: BulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 sm:px-4">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          size="sm"
          className="min-h-[44px] gap-1.5 bg-green-600 text-white hover:bg-green-700"
          disabled={isStatusPending || selectedDraftCount === 0}
          onClick={onPublish}
        >
          <CheckCheck className="size-3.5" />
          <span>Publish{selectedDraftCount > 0 ? ` (${selectedDraftCount})` : ""}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={isStatusPending || selectedDraftCount === 0}
          onClick={onReject}
        >
          <XCircle className="size-3.5" />
          <span>Reject{selectedDraftCount > 0 ? ` (${selectedDraftCount})` : ""}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={isDeletePending}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          <span>Delete</span>
        </Button>
        <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
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
          </div>

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

interface ReviewDialogProps {
  event: EventWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTagIds: string[]
  allTags: EventTag[]
  tagNameById: Map<string, string>
  tagNameBySlug: Map<string, string>
  onToggleTag: (tagId: string) => void
  onSaveTags: () => void
  selectedEventTrace: EventAiTraceWithParsed | null
  isTraceLoading: boolean
  onPublish: () => void
  onReject: () => void
}

export function AdminEventReviewDialog({
  event,
  open,
  onOpenChange,
  editingTagIds,
  allTags,
  tagNameById,
  tagNameBySlug,
  onToggleTag,
  onSaveTags,
  selectedEventTrace,
  isTraceLoading,
  onPublish,
  onReject,
}: ReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {event && (
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <img
              src={
                safeImageSrc(event.images?.[0]) ?? `https://picsum.photos/seed/${event.id}/600/300`
              }
              alt={event.title}
              className="w-full h-40 object-cover rounded-xl"
            />
            <div>
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {cleanDescription(event.description)}
              </p>
            </div>
            <FormGrid cols={2} gap="3" className="text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>{" "}
                <span className="font-medium">
                  <ClientDate value={event.start_datetime} pattern="MMM d, h:mm a" />
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Venue:</span>{" "}
                <span className="font-medium">{event.venue_name ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Price:</span>{" "}
                <span className="font-medium">{formatEventPrice(event.price, event.is_free)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">AI confidence:</span>{" "}
                <span className="font-medium">{Math.round((event.ai_confidence ?? 0) * 100)}%</span>
              </div>
            </FormGrid>
            <div>
              <p className="text-sm font-semibold mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {event.tags?.map((tag) => (
                  <TagBadge key={tag.tag_id} tag={tag.tag} />
                ))}
                {allTags.map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => onToggleTag(tag.id)}
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-colors",
                      editingTagIds.includes(tag.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                    )}
                  >
                    {editingTagIds.includes(tag.id) ? "✓" : "+"} {tag.name}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={onSaveTags}>
                Save Tag Overrides
              </Button>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-sm font-semibold">AI Tagging Details</p>
              </div>

              {isTraceLoading ? (
                <div className="space-y-2 rounded-xl border border-border/60 p-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : selectedEventTrace ? (
                <div className="space-y-4 rounded-xl border border-border/60 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Bot className="size-3" />
                      {selectedEventTrace.provider
                        ? formatProviderLabel(selectedEventTrace.provider)
                        : "Unknown provider"}
                    </Badge>
                    {selectedEventTrace.model ? (
                      <Badge variant="outline">Model: {selectedEventTrace.model}</Badge>
                    ) : null}
                    <Badge variant="outline">Status: {selectedEventTrace.status}</Badge>
                    <Badge variant="outline">
                      Run:{" "}
                      <ClientDate value={selectedEventTrace.created_at} pattern="MMM d, h:mm a" />
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Summary
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {selectedEventTrace.reasoning_summary ?? "No explanation was recorded."}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Fallback reason
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {selectedEventTrace.fallback_reason ?? "None"}
                      </p>
                    </div>
                  </div>

                  {selectedEventTrace.status !== "success" && selectedEventTrace.fallback_reason ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>{selectedEventTrace.fallback_reason}</span>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        AI suggested tags
                      </p>
                      <div className="mt-2 space-y-2">
                        {selectedEventTrace.parsed_predicted_tags.length > 0 ? (
                          selectedEventTrace.parsed_predicted_tags.map((tag) => (
                            <div key={tag.slug} className="rounded-lg border border-border/60 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium">
                                  {tagNameBySlug.get(tag.slug) ?? tag.slug}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(tag.confidence * 100)}%
                                </span>
                              </div>
                              {tag.reason ? (
                                <p className="mt-1 text-xs text-muted-foreground">{tag.reason}</p>
                              ) : null}
                              {tag.matched_keywords?.length ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Keywords: {tag.matched_keywords.join(", ")}
                                </p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No AI tag suggestions recorded.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Final admin tags
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {editingTagIds.length > 0 ? (
                          editingTagIds.map((tagId) => (
                            <Badge key={tagId} variant="outline">
                              {tagNameById.get(tagId) ?? tagId}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No final tags selected.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Extracted fields
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>
                          Age: {selectedEventTrace.parsed_predicted_fields?.age_min ?? "—"}
                          {selectedEventTrace.parsed_predicted_fields?.age_max !== null &&
                          selectedEventTrace.parsed_predicted_fields?.age_max !== undefined
                            ? ` to ${selectedEventTrace.parsed_predicted_fields.age_max}`
                            : ""}
                        </div>
                        <div>
                          Price:{" "}
                          {formatEventPrice(
                            selectedEventTrace.parsed_predicted_fields?.price ?? null,
                            selectedEventTrace.parsed_predicted_fields?.is_free ?? false
                          )}
                        </div>
                        <div>
                          Venue: {selectedEventTrace.parsed_predicted_fields?.venue_name ?? "—"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Classification input
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {selectedEventTrace.input_title}
                        </p>
                        <p>{selectedEventTrace.input_description ?? "No description captured."}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  No AI trace has been recorded for this event yet.
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-2" asChild>
                <Link to={`/admin/events/${event.id}/edit`}>
                  <Pencil className="size-4" />
                  Edit full event
                </Link>
              </Button>
              <Button className="flex-1 gap-2" onClick={onPublish}>
                <Check className="size-4" />
                Publish
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={onReject}
              >
                <X className="size-4" />
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
