import { Check, Search } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/utils/format"
import { Toolbar } from "@/components/v2"

export { AdminAccessList } from "@/features/admin/components/admin-access-list"
export { AdminAccessDisableDialog } from "@/features/admin/components/admin-access-disable-dialog"
export { AdminAccessDeleteDialog } from "@/features/admin/components/admin-access-delete-dialog"

interface AdminAccessHeaderProps {
  query: string
  onQueryChange: (value: string) => void
  loadedCount?: number
  allLoadedSelected?: boolean
  onToggleSelectAll?: () => void
}

export function AdminAccessHeader({
  query,
  onQueryChange,
  loadedCount,
  allLoadedSelected,
  onToggleSelectAll,
}: AdminAccessHeaderProps) {
  const showSelect = loadedCount != null && onToggleSelectAll && loadedCount > 0

  return (
    <Toolbar
      title="Account Access"
      subtitle="Enable, disable, or permanently delete invited accounts."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[200px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search by name or email"
              className="min-h-[44px] pl-9"
            />
          </div>
          {showSelect && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-1.5 text-xs"
              onClick={onToggleSelectAll}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex size-3.5 shrink-0 items-center justify-center rounded-md border border-input shadow-xs transition-colors",
                  allLoadedSelected && "border-primary bg-primary text-primary-foreground"
                )}
              >
                <Check className="size-3" />
              </span>
              <span className="truncate">
                {allLoadedSelected ? "Deselect loaded" : `Select loaded (${loadedCount})`}
              </span>
            </Button>
          )}
        </div>
      }
    />
  )
}

interface AdminAccessBulkBarProps {
  selectedCount: number
  isDeletePending: boolean
  onDelete: () => void
  onClear: () => void
}

export function AdminAccessBulkBar({
  selectedCount,
  isDeletePending,
  onDelete,
  onClear,
}: AdminAccessBulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="animate-in slide-in-from-top-2 duration-200 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 shadow-sm sm:px-4">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="min-h-[44px] gap-2 text-xs"
          onClick={onDelete}
          disabled={isDeletePending}
        >
          Delete selected
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] gap-2 text-xs"
          onClick={onClear}
          disabled={isDeletePending}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
