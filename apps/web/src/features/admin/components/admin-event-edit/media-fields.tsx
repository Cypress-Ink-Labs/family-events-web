import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { safeImageSrc } from "@/lib/platform/safe-url"
import {
  AdminEventEditSection,
  FieldError,
} from "@/features/admin/components/admin-event-edit-sections"
import type { AdminEventEditorForm } from "@/features/admin/components/admin-event-edit/_shared"

export function AdminEventMediaFields({ form }: { form: AdminEventEditorForm }) {
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
