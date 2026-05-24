import { Search } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { Toolbar } from "@/components/v2"

export { AdminAccessList } from "@/features/admin/components/admin-access-list"
export { AdminAccessDisableDialog } from "@/features/admin/components/admin-access-disable-dialog"

interface AdminAccessHeaderProps {
  query: string
  onQueryChange: (value: string) => void
}

export function AdminAccessHeader({ query, onQueryChange }: AdminAccessHeaderProps) {
  return (
    <Toolbar
      title="Account Access"
      subtitle="Enable or disable invited accounts without deleting them."
      actions={
        <div className="relative w-full min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by name or email"
            className="min-h-[44px] pl-9"
          />
        </div>
      }
    />
  )
}
