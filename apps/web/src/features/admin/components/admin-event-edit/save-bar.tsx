import { Save } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

export function AdminEventSaveBar({ isSaving }: { isSaving: boolean }) {
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
