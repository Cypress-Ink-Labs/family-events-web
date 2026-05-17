import { format } from "date-fns"
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  Eye,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import type {
  City,
  Event,
  EventAiTraceWithParsed,
  EventWithDetails,
  Tag as EventTag,
} from "@/lib/types"
import { safeImageSrc } from "@/lib/safe-url"
import { cn, formatEventPrice } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { AgeRangeBadge, TagBadge } from "@/features/events/components/tag-badge"
import { FilterBar, FormGrid } from "@/components/v2"
import { groupByCity } from "@/lib/group-by-city"
import type { CityFilterValue } from "@/features/admin/hooks/use-city-filter"

export type AdminEventStatusFilter = Event["status"] | "all"

export function formatProviderLabel(provider: "openai" | "keyword-fallback" | null | undefined) {
  if (provider === "openai") return "OpenAI"
  if (provider === "keyword-fallback") return "Keyword fallback"
  return "Unknown"
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
  eventCount: number
  allVisibleSelected: boolean
  onToggleSelectAll: () => void
}

export function AdminEventsToolbar({
  keyword,
  onKeywordChange,
  eventCount,
  allVisibleSelected,
  onToggleSelectAll,
}: ToolbarProps) {
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
      {eventCount > 0 && (
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
              allVisibleSelected && "border-primary bg-primary text-primary-foreground"
            )}
          >
            <Check className="size-3" />
          </span>
          <span className="truncate">
            {allVisibleSelected ? "Deselect all" : `Select all (${eventCount})`}
          </span>
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
  events: EventWithDetails[]
  selectedIds: Set<string>
  statusConfig: Record<Event["status"], { label: string; color: string }>
  cities: City[]
  cityFilter: CityFilterValue
  onToggleSelect: (id: string) => void
  onOpenReview: (event: EventWithDetails) => void
  onUpdateStatus: (id: string, status: Event["status"]) => void
}

export function AdminEventsList({
  events,
  selectedIds,
  statusConfig,
  cities,
  cityFilter,
  onToggleSelect,
  onOpenReview,
  onUpdateStatus,
}: EventsListProps) {
  if (cityFilter !== "all") {
    return (
      <div className="space-y-2">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isSelected={selectedIds.has(event.id)}
            statusConfig={statusConfig}
            onToggleSelect={onToggleSelect}
            onOpenReview={onOpenReview}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </div>
    )
  }

  const groups = groupByCity(events, cities)
  return (
    <div className="space-y-3">
      {groups.map((group) => {
        if (group.items.length === 0) return null
        return (
          <Collapsible key={group.key} defaultOpen={false}>
            <Card className="border-border/60">
              <CollapsibleTrigger className="w-full group">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                    <h3 className="font-semibold text-sm text-foreground">{group.label}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {group.items.length}
                    </Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border/60 p-3 space-y-2">
                  {group.items.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isSelected={selectedIds.has(event.id)}
                      statusConfig={statusConfig}
                      onToggleSelect={onToggleSelect}
                      onOpenReview={onOpenReview}
                      onUpdateStatus={onUpdateStatus}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}
    </div>
  )
}

interface EventCardProps {
  event: EventWithDetails
  isSelected: boolean
  statusConfig: Record<Event["status"], { label: string; color: string }>
  onToggleSelect: (id: string) => void
  onOpenReview: (event: EventWithDetails) => void
  onUpdateStatus: (id: string, status: Event["status"]) => void
}

function EventCard({
  event,
  isSelected,
  statusConfig,
  onToggleSelect,
  onOpenReview,
  onUpdateStatus,
}: EventCardProps) {
  const imageUrl =
    safeImageSrc(event.images?.[0]) ?? `https://picsum.photos/seed/${event.id}/200/200`
  const status = statusConfig[event.status]

  return (
    <Card
      className={cn(
        "border-border/60 transition-colors",
        isSelected && "border-primary/50 bg-primary/5"
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-3 items-start">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(event.id)}
            className="mt-1 shrink-0"
            aria-label={`Select ${event.title}`}
          />
          <div className="size-14 rounded-xl overflow-hidden shrink-0 bg-muted">
            <img src={imageUrl} alt={event.title} className="size-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground leading-tight flex-1">
                {event.title}
              </h3>
              <span
                className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", status.color)}
              >
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{format(new Date(event.start_datetime), "MMM d, h:mm a")}</span>
              <span>{event.venue_name}</span>
              {event.ai_confidence !== null && (
                <span className="flex items-center gap-1">
                  <Tag className="size-3" />
                  AI: {Math.round((event.ai_confidence ?? 0) * 100)}%
                </span>
              )}
              {event.ai_tag_provider && (
                <span className="flex items-center gap-1">
                  <Bot className="size-3" />
                  {formatProviderLabel(event.ai_tag_provider)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
              {event.tags?.slice(0, 2).map((tag) => (
                <TagBadge key={tag.tag_id} tag={tag.tag} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Review event"
              className="size-11"
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
                  className="size-11 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20"
                  onClick={() => onUpdateStatus(event.id, "published")}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reject event"
                  className="size-11 text-destructive hover:bg-destructive/10"
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
                className="size-11 text-destructive hover:bg-destructive/10"
                onClick={() => onUpdateStatus(event.id, "archived")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
            </div>
            <FormGrid cols={2} gap="3" className="text-sm">
              <div>
                <span className="text-muted-foreground">Date:</span>{" "}
                <span className="font-medium">
                  {format(new Date(event.start_datetime), "MMM d, h:mm a")}
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
                      {formatProviderLabel(selectedEventTrace.provider)}
                    </Badge>
                    {selectedEventTrace.model ? (
                      <Badge variant="outline">Model: {selectedEventTrace.model}</Badge>
                    ) : null}
                    <Badge variant="outline">Status: {selectedEventTrace.status}</Badge>
                    <Badge variant="outline">
                      Run: {format(new Date(selectedEventTrace.created_at), "MMM d, h:mm a")}
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
