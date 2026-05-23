import { Controller } from "react-hook-form"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { FormGrid } from "@/components/v2"
import {
  AdminEventEditSection,
  FieldError,
} from "@/features/admin/components/admin-event-edit-sections"
import type { AdminEventEditorForm } from "@/features/admin/components/admin-event-edit/_shared"

export function AdminEventAudiencePricingFields({ form }: { form: AdminEventEditorForm }) {
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
