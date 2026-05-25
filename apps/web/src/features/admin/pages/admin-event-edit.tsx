import { ArrowLeft, Archive, Check, Trash2, XCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { ClientDate } from "@/shared/components/client-date"
import { useAdminCities } from "@/features/admin/hooks/use-admin-cities"
import {
  useAdminEventDetail,
  useAdminEventLatestTrace,
} from "@/features/admin/hooks/events/use-admin-event-detail"
import {
  useCreateAdminEvent,
  useUpdateAdminEvent,
  useUnlockAdminEventFields,
} from "@/features/admin/hooks/events/use-admin-event-editor"
import { useDeleteAdminEvents } from "@/features/admin/hooks/events/use-admin-events"
import { useAdminSources } from "@/features/admin/hooks/sources/use-admin-sources"
import { AdminEventEditForm, type AdminEventEditSubmit } from "../components/admin-event-edit-form"
import { EventStatusBadge } from "../components/admin-event-edit-sections"
import { useTags } from "@/features/events/hooks/use-tags"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"
import { formatSlugLabel } from "@/shared/utils/format"
import type { Event } from "@/shared/types"

export function AdminEventEditPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const isDirtyRef = useRef(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const eventQuery = useAdminEventDetail(eventId)
  const traceQuery = useAdminEventLatestTrace(eventId)
  const citiesQuery = useAdminCities()
  const sourcesQuery = useAdminSources()
  const tagsQuery = useTags()
  const updateEvent = useUpdateAdminEvent()
  const createEvent = useCreateAdminEvent()
  const unlockFields = useUnlockAdminEventFields()
  const deleteEvents = useDeleteAdminEvents()

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  const confirmLeave = useCallback(() => {
    return !isDirtyRef.current || window.confirm("Discard unsaved event changes?")
  }, [])

  function goBack() {
    if (confirmLeave()) {
      navigate("/admin/events")
    }
  }

  async function handleSubmit(input: AdminEventEditSubmit) {
    if (!eventId) return
    setSaveError(null)
    try {
      await updateEvent.mutateAsync({
        eventId,
        patch: input.patch,
        tagIds: input.tagIds,
      })
      toast.success("Event saved")
      isDirtyRef.current = false
    } catch (error) {
      setSaveError(humanizeSupabaseError(error, "Failed to save event."))
    }
  }

  async function updateStatus(status: Event["status"]) {
    if (!eventId || !eventQuery.data) return
    setSaveError(null)
    try {
      await updateEvent.mutateAsync({
        eventId,
        patch: { status },
        tagIds: eventQuery.data.tags?.map((tag) => tag.tag_id) ?? [],
      })
      toast.success(`Event ${formatSlugLabel(status)}`)
      isDirtyRef.current = false
    } catch (error) {
      setSaveError(humanizeSupabaseError(error, "Failed to update event status."))
    }
  }

  async function handleDelete() {
    if (!eventId) return
    if (!window.confirm("Delete this event? This cannot be undone.")) return
    try {
      await deleteEvents.mutateAsync([eventId])
      toast.success("Event deleted")
      navigate("/admin/events")
    } catch (error) {
      setSaveError(humanizeSupabaseError(error, "Failed to delete event."))
    }
  }

  async function handleUnlockFields() {
    if (!eventId) return
    try {
      await unlockFields.mutateAsync(eventId)
      toast.success("Field locks cleared")
    } catch (error) {
      setSaveError(humanizeSupabaseError(error, "Failed to unlock fields."))
    }
  }

  if (!eventId) {
    return <AdminEventEditMissing />
  }

  if (eventQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    )
  }

  if (eventQuery.error) {
    return (
      <AdminEventEditMessage
        title="Could not load event"
        description={humanizeSupabaseError(eventQuery.error, "Failed to load event.")}
      />
    )
  }

  if (!eventQuery.data) {
    return <AdminEventEditMissing />
  }

  const event = eventQuery.data
  const formKey = `${event.id}:${event.updated_at}:${event.admin_last_edited_at ?? ""}`

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={goBack}>
          <ArrowLeft className="size-4" />
          Events
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{event.title}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Last edited{" "}
            {event.admin_last_edited_at ? (
              <ClientDate value={event.admin_last_edited_at} pattern="Pp" />
            ) : (
              "never"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => updateStatus("published")}
            disabled={updateEvent.isPending}
          >
            <Check className="size-4" />
            Publish
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => updateStatus("archived")}
            disabled={updateEvent.isPending}
          >
            <Archive className="size-4" />
            Archive
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => updateStatus("rejected")}
            disabled={updateEvent.isPending}
          >
            <XCircle className="size-4" />
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
            disabled={deleteEvents.isPending}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <AdminEventEditForm
        key={formKey}
        event={event}
        cities={citiesQuery.data ?? []}
        sources={sourcesQuery.data ?? []}
        tags={tagsQuery.data ?? []}
        trace={traceQuery.data ?? null}
        isTraceLoading={traceQuery.isLoading}
        isSaving={updateEvent.isPending || createEvent.isPending}
        isUnlocking={unlockFields.isPending}
        saveError={saveError}
        onSubmit={handleSubmit}
        dirtyRef={isDirtyRef}
        onUnlockFields={handleUnlockFields}
      />
    </div>
  )
}

function AdminEventEditMissing() {
  return (
    <AdminEventEditMessage
      title="Event not found"
      description="The event does not exist or is no longer available to edit."
    />
  )
}

function AdminEventEditMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border p-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/admin/events">Back to events</Link>
      </Button>
    </div>
  )
}
