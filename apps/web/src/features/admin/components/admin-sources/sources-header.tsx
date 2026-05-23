import { MoreHorizontal, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/shared/utils/format"
import { Toolbar } from "@/components/v2"
import type { City, EventProcessingMode } from "@/shared/types"
import {
  AddSourceDialog,
  type SourceDraft,
} from "@/features/admin/components/admin-sources/add-source-dialog"

interface AdminSourcesHeaderProps {
  activeSourceCount: number
  cities: City[]
  dialogOpen: boolean
  newSource: SourceDraft
  isBulkPending: boolean
  isScrapeAllPending: boolean
  onDialogOpenChange: (open: boolean) => void
  onSourceDraftPatch: (patch: Partial<SourceDraft>) => void
  onAddSource: () => void
  onBulkSetProcessingMode: (mode: EventProcessingMode) => void
  onScrapeAll: () => void
}

export function AdminSourcesHeader({
  activeSourceCount,
  cities,
  dialogOpen,
  newSource,
  isBulkPending,
  isScrapeAllPending,
  onDialogOpenChange,
  onSourceDraftPatch,
  onAddSource,
  onBulkSetProcessingMode,
  onScrapeAll,
}: AdminSourcesHeaderProps) {
  return (
    <Toolbar
      title="Event Sources"
      subtitle={`${activeSourceCount} active`}
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] gap-1.5"
                disabled={isBulkPending || isScrapeAllPending}
                aria-label="Bulk actions"
              >
                <MoreHorizontal className="size-4" />
                <span className="hidden sm:inline">Bulk</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onScrapeAll} disabled={isScrapeAllPending}>
                <RefreshCw className={cn("mr-2 size-4", isScrapeAllPending && "animate-spin")} />
                Scrape All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onBulkSetProcessingMode("manual_review")}
                disabled={isBulkPending}
              >
                Set Manual Review
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onBulkSetProcessingMode("auto_approve")}
                disabled={isBulkPending}
              >
                Set Auto Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onBulkSetProcessingMode("llm_review")}
                disabled={isBulkPending}
              >
                Set LLM Review
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AddSourceDialog
            open={dialogOpen}
            cities={cities}
            newSource={newSource}
            onOpenChange={onDialogOpenChange}
            onSourceDraftPatch={onSourceDraftPatch}
            onAddSource={onAddSource}
          />
        </>
      }
    />
  )
}
