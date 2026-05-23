import { Check, Pencil, X, XCircle } from "lucide-react"
import { Link } from "react-router-dom"
import type { EventAiTraceWithParsed, EventWithDetails, Tag as EventTag } from "@/lib/types"
import { safeImageSrc } from "@/lib/platform/safe-url"
import { formatEventPrice } from "@/lib/utils"
import { cleanDescription } from "@family-events/shared"
import { Button } from "@/components/ui/button"
import { ClientDate } from "@/components/client-date"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { FormGrid } from "@/components/v2"
import { LlmReviewSummary } from "@/features/admin/components/admin-event-review/llm-review-summary"
import { TagOverridesEditor } from "@/features/admin/components/admin-event-review/tag-overrides-editor"
import { AiTracePanel } from "@/features/admin/components/admin-event-review/ai-trace-panel"

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
            <LlmReviewSummary event={event} />
            <TagOverridesEditor
              event={event}
              allTags={allTags}
              editingTagIds={editingTagIds}
              onToggleTag={onToggleTag}
              onSaveTags={onSaveTags}
            />
            <Separator />
            <AiTracePanel
              trace={selectedEventTrace}
              isLoading={isTraceLoading}
              editingTagIds={editingTagIds}
              tagNameById={tagNameById}
              tagNameBySlug={tagNameBySlug}
            />
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
