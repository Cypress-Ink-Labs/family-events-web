import { Controller } from "react-hook-form"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"
import { FormGrid } from "@/components/v2"
import { AdminEventEditSection } from "@/features/admin/components/admin-event-edit-sections"
import { EVENT_STATUS_OPTIONS } from "@/features/events/constants/status"
import type { AdminEventEditorForm } from "@/features/admin/components/admin-event-edit/_shared"

export function AdminEventVisibilityFields({ form }: { form: AdminEventEditorForm }) {
  const statusIsDirty = form.formState.dirtyFields.status === true

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
      {statusIsDirty && (
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="decision-reason">Decision reason (optional)</Label>
          <Textarea
            id="decision-reason"
            placeholder="Why are you changing the status? This helps the pipeline learn from your decisions."
            rows={2}
            {...form.register("decision_reason")}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            Your reason is stored to help the automated review pipeline improve over time.
          </p>
        </div>
      )}
    </AdminEventEditSection>
  )
}
