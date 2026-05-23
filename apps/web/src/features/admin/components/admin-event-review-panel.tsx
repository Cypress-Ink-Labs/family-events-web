import { AlertTriangle, Bot, Check, Pencil, Sparkles, X, XCircle } from "lucide-react"
import { Link } from "react-router-dom"
import type { EventAiTraceWithParsed, EventWithDetails, Tag as EventTag } from "@/lib/types"
import { safeImageSrc } from "@/lib/platform/safe-url"
import { cn, formatEventPrice } from "@/lib/utils"
import { cleanDescription } from "@family-events/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClientDate } from "@/components/client-date"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { TagBadge } from "@/features/events/components/tag-badge"
import { FormGrid } from "@/components/v2"
import { formatProviderLabel } from "@/features/admin/utils/format-provider-label"

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
  onSetDraft: () => void
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
  onSetDraft,
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
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                <p className="text-sm font-semibold">LLM Review</p>
              </div>
              <div className="rounded-xl border border-border/60 p-4 space-y-2 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className="font-medium">{event.llm_review_status ?? "not_required"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Decision:</span>{" "}
                    <span className="font-medium">{event.llm_review_decision ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>{" "}
                    <span className="font-medium">
                      {event.llm_review_confidence == null
                        ? "—"
                        : Number(event.llm_review_confidence).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reviewed:</span>{" "}
                    <span className="font-medium">
                      {event.llm_reviewed_at ? (
                        <ClientDate value={event.llm_reviewed_at} pattern="MMM d, h:mm a" />
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Reason:</span>{" "}
                  <span className="font-medium">{event.llm_review_reason ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Flags:</span>{" "}
                  <span className="font-medium">
                    {event.llm_review_flags?.length ? event.llm_review_flags.join(", ") : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider/Model:</span>{" "}
                  <span className="font-medium">
                    {event.llm_review_provider ?? "—"}
                    {event.llm_review_model ? ` · ${event.llm_review_model}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Prompt:</span>{" "}
                  <span className="font-medium">{event.llm_review_prompt_version ?? "—"}</span>
                </div>
                {event.llm_review_error ? (
                  <div className="text-destructive">
                    <span className="text-muted-foreground">Error:</span>{" "}
                    <span className="font-medium">{event.llm_review_error}</span>
                  </div>
                ) : null}
              </div>
            </div>
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
              <Button variant="outline" className="flex-1 gap-2" onClick={onSetDraft}>
                <XCircle className="size-4" />
                Draft
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
