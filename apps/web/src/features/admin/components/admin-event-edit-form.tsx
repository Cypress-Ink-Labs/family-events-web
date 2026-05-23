import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, type MutableRefObject } from "react"
import { useForm } from "react-hook-form"
import type {
  City,
  EventAiTraceWithParsed,
  EventSource,
  EventWithDetails,
  Tag,
} from "@/shared/types"
import {
  adminEventEditorSchema,
  type AdminEventEditorInput,
  type AdminEventEditorValues,
} from "@/features/admin/lib/event-editor-schema"
import {
  changedEventPatch,
  editorValuesToEventPatch,
  eventToEditorValues,
  type AdminEventPatch,
} from "@/features/admin/lib/event-editor-mappers"
import { AdminEventAiReference } from "@/features/admin/components/admin-event-edit-sections"
import { AdminEventBasicsFields } from "@/features/admin/components/admin-event-edit/basics-fields"
import { AdminEventScheduleFields } from "@/features/admin/components/admin-event-edit/schedule-fields"
import { AdminEventLocationFields } from "@/features/admin/components/admin-event-edit/location-fields"
import { AdminEventAudiencePricingFields } from "@/features/admin/components/admin-event-edit/audience-pricing-fields"
import { AdminEventMediaFields } from "@/features/admin/components/admin-event-edit/media-fields"
import { AdminEventTagsField } from "@/features/admin/components/admin-event-edit/tags-field"
import { AdminEventSourceFields } from "@/features/admin/components/admin-event-edit/source-fields"
import { AdminEventVisibilityFields } from "@/features/admin/components/admin-event-edit/visibility-fields"
import { AdminEventAuditSummary } from "@/features/admin/components/admin-event-edit/audit-summary"
import { AdminEventSaveBar } from "@/features/admin/components/admin-event-edit/save-bar"
import { SaveErrorMessage } from "@/features/admin/components/admin-event-edit/save-error-message"

export interface AdminEventEditSubmit {
  patch: AdminEventPatch
  tagIds: string[]
}

interface AdminEventEditFormProps {
  event: EventWithDetails
  cities: City[]
  sources: EventSource[]
  tags: Tag[]
  trace: EventAiTraceWithParsed | null
  isTraceLoading: boolean
  isSaving: boolean
  isUnlocking: boolean
  saveError: string | null
  onSubmit: (input: AdminEventEditSubmit) => void
  dirtyRef: MutableRefObject<boolean>
  onUnlockFields: () => void
}

export function AdminEventEditForm({
  event,
  cities,
  sources,
  tags,
  trace,
  isTraceLoading,
  isSaving,
  isUnlocking,
  saveError,
  onSubmit,
  dirtyRef,
  onUnlockFields,
}: AdminEventEditFormProps) {
  const defaults = useMemo(() => eventToEditorValues(event), [event])
  const form = useForm<AdminEventEditorInput, unknown, AdminEventEditorValues>({
    resolver: zodResolver(adminEventEditorSchema),
    defaultValues: defaults,
  })
  const isDirty = form.formState.isDirty

  useEffect(() => {
    dirtyRef.current = isDirty
  }, [dirtyRef, isDirty])

  function submit(values: AdminEventEditorValues) {
    const patch = isDirty ? changedEventPatch(defaults, values) : editorValuesToEventPatch(values)
    onSubmit({ patch, tagIds: values.tagIds })
  }

  return (
    <form id="admin-event-edit-form" className="space-y-8" onSubmit={form.handleSubmit(submit)}>
      <SaveErrorMessage message={saveError} />
      <AdminEventBasicsFields form={form} />
      <AdminEventScheduleFields form={form} />
      <AdminEventLocationFields form={form} cities={cities} />
      <AdminEventAudiencePricingFields form={form} />
      <AdminEventMediaFields form={form} />
      <AdminEventTagsField form={form} tags={tags} />
      <AdminEventSourceFields
        form={form}
        event={event}
        sources={sources}
        isUnlocking={isUnlocking}
        onUnlockFields={onUnlockFields}
      />
      <AdminEventVisibilityFields form={form} />
      <AdminEventAiReference trace={trace} isLoading={isTraceLoading} />
      <AdminEventAuditSummary event={event} />
      <AdminEventSaveBar isSaving={isSaving} />
    </form>
  )
}
