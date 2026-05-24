import { Check, CheckCheck, Search, Trash2, XCircle } from "lucide-react"
import type { Event } from "@/shared/types"
import { cn, formatSlugLabel } from "@/shared/utils/format"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { FilterBar } from "@/components/v2"
import {
  ADMIN_EVENTS_PAGE_SIZE_OPTIONS,
  type AdminEventsPageSize,
} from "@/shared/constants/pagination"

export type AdminEventStatusFilter = Event["status"] | "all"
export type AdminLlmReviewFilter =
  | "all"
  | "reviewed"
  | "approved"
  | "rejected"
  | "needs_admin_review"
  | "failed"

interface StatusFilterBarProps {
  statusFilter: AdminEventStatusFilter
  counts: Record<string, number>
  total: number
  onChange: (status: AdminEventStatusFilter) => void
}

export function AdminEventStatusFilterBar({
  statusFilter,
  counts,
  total,
  onChange,
}: StatusFilterBarProps) {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-xl font-medium tracking-tight text-foreground md:text-2xl">
        Events
      </h2>
      <FilterBar>
        {(["all", "draft", "published", "rejected"] as const).map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => onChange(status)}
            className={cn(
              "inline-flex min-h-[36px] shrink-0 snap-start items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === status
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            )}
          >
            {formatSlugLabel(status)}
            {status !== "all" && counts[status] ? (
              <span className="opacity-70">({counts[status]})</span>
            ) : status === "all" ? (
              <span className="opacity-70">({total})</span>
            ) : null}
          </button>
        ))}
      </FilterBar>
    </div>
  )
}

interface LlmFilterBarProps {
  llmReviewFilter: AdminLlmReviewFilter
  onChange: (value: AdminLlmReviewFilter) => void
}

export function AdminLlmReviewFilterBar({ llmReviewFilter, onChange }: LlmFilterBarProps) {
  const options: Array<{ value: AdminLlmReviewFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "reviewed", label: "LLM reviewed" },
    { value: "approved", label: "LLM approved" },
    { value: "rejected", label: "LLM rejected" },
    { value: "needs_admin_review", label: "Needs Admin Review" },
    { value: "failed", label: "LLM failed" },
  ]

  return (
    <FilterBar>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex min-h-[36px] shrink-0 snap-start items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            llmReviewFilter === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-accent"
          )}
        >
          {option.label}
        </button>
      ))}
    </FilterBar>
  )
}

interface ToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  loadedCount: number
  totalCount: number
  allLoadedSelected: boolean
  onToggleSelectAll: () => void
  pageSize: AdminEventsPageSize
  onPageSizeChange: (value: AdminEventsPageSize) => void
}

export function AdminEventsToolbar({
  keyword,
  onKeywordChange,
  loadedCount,
  totalCount,
  allLoadedSelected,
  onToggleSelectAll,
  pageSize,
  onPageSizeChange,
}: ToolbarProps) {
  const buttonLabel = allLoadedSelected
    ? "Deselect loaded"
    : `Select loaded (${loadedCount} of ${totalCount})`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="Search events..."
          className="min-h-[44px] pl-9"
        />
      </div>
      <Select
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value) as AdminEventsPageSize)}
      >
        <SelectTrigger className="min-h-[44px] w-auto gap-1.5 text-xs" aria-label="Rows per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ADMIN_EVENTS_PAGE_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size} / page
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loadedCount > 0 && (
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
          <span className="truncate">{buttonLabel}</span>
        </Button>
      )}
    </div>
  )
}

interface BulkBarProps {
  selectedCount: number
  selectedDraftCount: number
  isStatusPending: boolean
  isDeletePending: boolean
  onPublish: () => void
  onReject: () => void
  onDelete: () => void
  onClear: () => void
}

export function AdminEventsBulkBar({
  selectedCount,
  selectedDraftCount,
  isStatusPending,
  isDeletePending,
  onPublish,
  onReject,
  onDelete,
  onClear,
}: BulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 sm:px-4">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          size="sm"
          className="min-h-[44px] gap-1.5 bg-green-600 text-white hover:bg-green-700"
          disabled={isStatusPending || selectedDraftCount === 0}
          onClick={onPublish}
        >
          <CheckCheck className="size-3.5" />
          <span>Publish{selectedDraftCount > 0 ? ` (${selectedDraftCount})` : ""}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={isStatusPending || selectedDraftCount === 0}
          onClick={onReject}
        >
          <XCircle className="size-3.5" />
          <span>Reject{selectedDraftCount > 0 ? ` (${selectedDraftCount})` : ""}</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={isDeletePending}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          <span>Delete</span>
        </Button>
        <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
}
