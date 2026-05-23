import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { FormGrid } from "@/components/v2"
import {
  AdminEventEditSection,
  FieldError,
} from "@/features/admin/components/admin-event-edit-sections"
import type { AdminEventEditorForm } from "@/features/admin/components/admin-event-edit/_shared"

export function AdminEventScheduleFields({ form }: { form: AdminEventEditorForm }) {
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
