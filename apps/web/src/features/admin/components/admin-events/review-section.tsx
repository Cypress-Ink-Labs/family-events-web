import { useEffect } from "react"
import { toast } from "sonner"
import { useAdminStore } from "@/features/admin/stores/admin-store"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { AdminEventReviewDialog } from "@/features/admin/components/admin-event-review-panel"
import { useAdminEventDetail } from "@/features/admin/hooks/events/use-admin-event-detail"
import {
  useAdminEventAiTrace,
  useUpdateAdminEventTags,
} from "@/features/admin/hooks/events/use-admin-event-ai-trace"
import { useTags } from "@/features/events/hooks/use-tags"
import type { Event } from "@/shared/types"

/**
 * Wires the admin-store-selected event id to the review dialog. Owned by
 * the admin-events page; lives in its own file so the page itself stays
 * focused on filtering/listing concerns.
 */
export function AdminEventReviewSection({
  onUpdateStatus,
}: {
  onUpdateStatus: (eventId: string, status: Event["status"]) => Promise<void>
}) {
  const selectedEventId = useAdminStore((state) => state.selectedEventId)
  const editingTagIds = useAdminStore((state) => state.editingTagIds)
  const setSelectedEventId = useAdminStore((state) => state.setSelectedEventId)
  const setEditingTagIds = useAdminStore((state) => state.setEditingTagIds)

  const selectedEvent = useAdminEventDetail(selectedEventId ?? undefined)
  const { data: selectedEventTrace, isLoading: isTraceLoading } =
    useAdminEventAiTrace(selectedEventId)
  const { data: allTags = [] } = useTags()
  const { mutate: updateTags } = useUpdateAdminEventTags()
  const { toastError } = useAdminToast()

  const tagNameById = new Map(allTags.map((tag) => [tag.id, tag.name]))
  const tagNameBySlug = new Map(allTags.map((tag) => [tag.slug, tag.name]))

  useEffect(() => {
    if (selectedEventId && !selectedEvent.isLoading && selectedEvent.data === null) {
      setSelectedEventId(null)
    }
  }, [selectedEvent.data, selectedEvent.isLoading, selectedEventId, setSelectedEventId])

  async function saveTagOverrides() {
    if (!selectedEvent.data) return
    try {
      await updateTags({ eventId: selectedEvent.data.id, tagIds: editingTagIds })
      toast.success("Tags updated")
    } catch (error) {
      toastError(error, "Failed to update tags.")
    }
  }

  return (
    <AdminEventReviewDialog
      event={selectedEvent.data ?? null}
      open={Boolean(selectedEvent.data)}
      onOpenChange={(open) => {
        if (!open) setSelectedEventId(null)
      }}
      editingTagIds={editingTagIds}
      allTags={allTags}
      tagNameById={tagNameById}
      tagNameBySlug={tagNameBySlug}
      onToggleTag={(tagId) => {
        setEditingTagIds(
          editingTagIds.includes(tagId)
            ? editingTagIds.filter((id) => id !== tagId)
            : [...editingTagIds, tagId]
        )
      }}
      onSaveTags={saveTagOverrides}
      selectedEventTrace={selectedEventTrace ?? null}
      isTraceLoading={isTraceLoading}
      onPublish={() => {
        if (selectedEvent.data) void onUpdateStatus(selectedEvent.data.id, "published")
      }}
      onReject={() => {
        if (selectedEvent.data) void onUpdateStatus(selectedEvent.data.id, "rejected")
      }}
      onSetDraft={() => {
        if (selectedEvent.data) void onUpdateStatus(selectedEvent.data.id, "draft")
      }}
    />
  )
}
