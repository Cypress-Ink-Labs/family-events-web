import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AdminEventEditSection,
  FieldError,
} from "@/features/admin/components/admin-event-edit-sections"
import type { AdminEventEditorForm } from "@/features/admin/components/admin-event-edit/_shared"

export function AdminEventBasicsFields({ form }: { form: AdminEventEditorForm }) {
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
