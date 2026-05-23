import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { useEffect, useMemo, type MutableRefObject } from "react"
import { Controller, useForm, type UseFormReturn } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { FormGrid } from "@/components/v2"
import { ClientDate } from "@/components/client-date"
import type { City, EventAiTraceWithParsed, EventSource, EventWithDetails, Tag } from "@/lib/types"
import { safeImageSrc } from "@/lib/platform/safe-url"
import { cn } from "@/lib/utils"
import { adminEventEditorSchema, type AdminEventEditorValues } from "../lib/event-editor-schema"
import type { AdminEventEditorInput } from "../lib/event-editor-schema"
import {
  changedEventPatch,
  editorValuesToEventPatch,
  eventToEditorValues,
  type AdminEventPatch,
} from "../lib/event-editor-mappers"
import {
  AdminEventAiReference,
  AdminEventEditSection,
  FieldError,
  LockedFieldsSummary,
} from "./admin-event-edit-sections"
import { EVENT_STATUS_OPTIONS } from "@/features/events/constants/status"

const NONE_VALUE = "__none__"

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

type AdminEventEditorForm = UseFormReturn<AdminEventEditorInput, unknown, AdminEventEditorValues>

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

function SaveErrorMessage({ message }: { message: string | null }) {
  if (!message) {
    return null
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  )
}

function AdminEventBasicsFields({ form }: { form: AdminEventEditorForm }) {
  const {
    formState: { errors },
    register,
  } = form

  return (
    <AdminEventEditSection title="Basics">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} />
        <FieldError message={errors.title?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={8} {...register("description")} />
        <FieldError message={errors.description?.message} />
      </div>
    </AdminEventEditSection>
  )
}

function AdminEventScheduleFields({ form }: { form: AdminEventEditorForm }) {
  const {
    formState: { errors },
    register,
  } = form

  return (
    <AdminEventEditSection title="Schedule">
      <FormGrid cols={3} gap="4">
        <div className="space-y-1.5">
          <Label htmlFor="start_datetime">Start</Label>
          <Input id="start_datetime" type="datetime-local" {...register("start_datetime")} />
          <FieldError message={errors.start_datetime?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_datetime">End</Label>
          <Input id="end_datetime" type="datetime-local" {...register("end_datetime")} />
          <FieldError message={errors.end_datetime?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" {...register("timezone")} />
          <FieldError message={errors.timezone?.message} />
        </div>
      </FormGrid>
      <div className="space-y-1.5">
        <Label htmlFor="recurrenceInfoText">Recurrence JSON</Label>
        <Textarea id="recurrenceInfoText" rows={5} {...register("recurrenceInfoText")} />
        <FieldError message={errors.recurrenceInfoText?.message} />
      </div>
    </AdminEventEditSection>
  )
}

function AdminEventLocationFields({
  form,
  cities,
}: {
  form: AdminEventEditorForm
  cities: City[]
}) {
  const { control, register } = form

  return (
    <AdminEventEditSection title="Location">
      <FormGrid cols={2} gap="4">
        <div className="space-y-1.5">
          <Label htmlFor="venue_name">Venue</Label>
          <Input id="venue_name" {...register("venue_name")} />
        </div>
        <div className="space-y-1.5">
          <Label>City</Label>
          <Controller
            control={control}
            name="city_id"
            render={({ field }) => (
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) => field.onChange(value === NONE_VALUE ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No city</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                      {city.state ? `, ${city.state}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...register("address")} />
        </div>
        <div className="space-y-1.5">
          <Label>Outdoor</Label>
          <Controller
            control={control}
            name="is_outdoor"
            render={({ field }) => (
              <Select
                value={field.value === null ? NONE_VALUE : String(field.value)}
                onValueChange={(value) =>
                  field.onChange(value === NONE_VALUE ? null : value === "true")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Unknown</SelectItem>
                  <SelectItem value="true">Outdoor</SelectItem>
                  <SelectItem value="false">Indoor</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" inputMode="decimal" {...register("latitude")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" inputMode="decimal" {...register("longitude")} />
        </div>
      </FormGrid>
    </AdminEventEditSection>
  )
}

function AdminEventAudiencePricingFields({ form }: { form: AdminEventEditorForm }) {
  const {
    control,
    formState: { errors },
    register,
  } = form

  return (
    <AdminEventEditSection title="Audience and pricing">
      <FormGrid cols={3} gap="4">
        <div className="space-y-1.5">
          <Label htmlFor="age_min">Minimum age</Label>
          <Input id="age_min" inputMode="numeric" {...register("age_min")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age_max">Maximum age</Label>
          <Input id="age_max" inputMode="numeric" {...register("age_max")} />
          <FieldError message={errors.age_max?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price</Label>
          <Input id="price" inputMode="decimal" {...register("price")} />
          <FieldError message={errors.price?.message} />
        </div>
        <div className="flex items-center gap-3 pt-7">
          <Controller
            control={control}
            name="is_free"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label>Free event</Label>
        </div>
      </FormGrid>
    </AdminEventEditSection>
  )
}

function AdminEventMediaFields({ form }: { form: AdminEventEditorForm }) {
  const {
    formState: { errors },
    register,
    watch,
  } = form
  const imagesText = String(watch("imagesText") ?? "")
  const imagePreviews = imagesText.split("\n").flatMap((value) => {
    const image = safeImageSrc(value.trim())
    return image ? [image] : []
  })

  return (
    <AdminEventEditSection title="Media">
      <div className="space-y-1.5">
        <Label htmlFor="imagesText">Images</Label>
        <Textarea id="imagesText" rows={5} {...register("imagesText")} />
        <FieldError message={errors.imagesText?.message} />
      </div>
      {imagePreviews.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {imagePreviews.slice(0, 5).map((image) => (
            <img
              key={image}
              src={image}
              alt=""
              className="size-20 rounded-lg border border-border object-cover"
            />
          ))}
        </div>
      ) : null}
    </AdminEventEditSection>
  )
}

function AdminEventTagsField({ form, tags }: { form: AdminEventEditorForm; tags: Tag[] }) {
  return (
    <AdminEventEditSection title="Tags">
      <Controller
        control={form.control}
        name="tagIds"
        render={({ field }) => (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const checked = field.value.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    field.onChange(
                      checked ? field.value.filter((id) => id !== tag.id) : [...field.value, tag.id]
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    checked
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary"
                  )}
                >
                  <Checkbox checked={checked} className="size-3.5" />
                  {tag.name}
                </button>
              )
            })}
          </div>
        )}
      />
    </AdminEventEditSection>
  )
}

function AdminEventSourceFields({
  form,
  event,
  sources,
  isUnlocking,
  onUnlockFields,
}: {
  form: AdminEventEditorForm
  event: EventWithDetails
  sources: EventSource[]
  isUnlocking: boolean
  onUnlockFields: () => void
}) {
  const {
    control,
    formState: { errors },
    register,
  } = form

  return (
    <AdminEventEditSection title="Source and ingestion">
      <FormGrid cols={3} gap="4">
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Controller
            control={control}
            name="source_id"
            render={({ field }) => (
              <Select
                value={field.value ?? NONE_VALUE}
                onValueChange={(value) => field.onChange(value === NONE_VALUE ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No source</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source_name">Source name</Label>
          <Input id="source_name" {...register("source_name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source_url">Source URL</Label>
          <Input id="source_url" {...register("source_url")} />
          <FieldError message={errors.source_url?.message} />
        </div>
      </FormGrid>
      <LockedFieldsSummary
        fields={event.admin_locked_fields}
        onUnlock={onUnlockFields}
        isUnlocking={isUnlocking}
      />
    </AdminEventEditSection>
  )
}

function AdminEventVisibilityFields({ form }: { form: AdminEventEditorForm }) {
  return (
    <AdminEventEditSection title="Visibility and status">
      <FormGrid cols={2} gap="4">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex items-center gap-3 pt-7">
          <Controller
            control={form.control}
            name="is_featured"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label>Featured</Label>
        </div>
      </FormGrid>
    </AdminEventEditSection>
  )
}

function AdminEventAuditSummary({ event }: { event: EventWithDetails }) {
  return (
    <AdminEventEditSection title="Audit summary">
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{event.admin_locked_fields.length} locked fields</Badge>
        <Badge variant="outline">
          Last edited:{" "}
          {event.admin_last_edited_at ? (
            <ClientDate value={event.admin_last_edited_at} pattern="Pp" />
          ) : (
            "Never"
          )}
        </Badge>
        {event.admin_last_edited_by ? (
          <Badge variant="outline">Editor: {event.admin_last_edited_by}</Badge>
        ) : null}
      </div>
    </AdminEventEditSection>
  )
}

function AdminEventSaveBar({ isSaving }: { isSaving: boolean }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-t-lg sm:border">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="submit" disabled={isSaving} className="gap-2">
          <Save className="size-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}
