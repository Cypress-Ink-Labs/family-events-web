import { Controller } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { AdminEventEditSection } from "@/features/admin/components/admin-event-edit-sections"
import type { Tag } from "@/lib/types"
import type { AdminEventEditorForm } from "@/features/admin/components/admin-event-edit/_shared"

export function AdminEventTagsField({ form, tags }: { form: AdminEventEditorForm; tags: Tag[] }) {
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
