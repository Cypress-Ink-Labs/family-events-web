import { Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormGrid } from "@/components/v2"
import {
  AdminEventEditSection,
  FieldError,
  LockedFieldsSummary,
} from "@/features/admin/components/admin-event-edit-sections"
import type { EventSource, EventWithDetails } from "@/shared/types"
import {
  type AdminEventEditorForm,
  NONE_VALUE,
} from "@/features/admin/components/admin-event-edit/_shared"

export function AdminEventSourceFields({
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
