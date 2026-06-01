import { Check, CheckCheck, Search, Trash2, XCircle } from "lucide-react"
import type { Event } from "@/shared/types"
import { cn, formatSlugLabel } from "@/shared/utils/format"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { TogglePill } from "@/shared/components/ui/toggle-pill"
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
import {
  ADMIN_LLM_REVIEW_FILTER_OPTIONS,
  type AdminLlmReviewFilter,
} from "@/shared/constants/llm-review"

export type AdminEventStatusFilter = Event["status"] | "all"
export type { AdminLlmReviewFilter }

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
    <div className="flex items-center gap-3">
      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Status
      </span>
      <FilterBar>
        {(["all", "draft", "published", "rejected"] as const).map((status) => (
          <TogglePill
            key={status}
            active={statusFilter === status}
            onClick={() => onChange(status)}
          >
            {formatSlugLabel(status)}
            {status !== "all" && counts[status] ? (
              <span className="opacity-70">({counts[status]})</span>
            ) : status === "all" ? (
              <span className="opacity-70">({total})</span>
            ) : null}
          </TogglePill>
        ))}
      </FilterBar>
    </div>
  )
}

interface LlmFilterBarProps {
  llmReviewFilter: AdminLlmReviewFilter
  onChange: (value: AdminLlmReviewFilter) => void
}

const LLM_LABEL_OVERRIDES: Partial<Record<AdminLlmReviewFilter, string>> = {
  needs_admin_review: "Needs Review",
}

function displayLlmLabel(option: { value: AdminLlmReviewFilter; label: string }): string {
  return LLM_LABEL_OVERRIDES[option.value] ?? option.label.replace(/^LLM\s+/i, "")
}

export function AdminLlmReviewFilterBar({ llmReviewFilter, onChange }: LlmFilterBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        AI Review
      </span>
      <FilterBar>
        {ADMIN_LLM_REVIEW_FILTER_OPTIONS.map((option) => (
          <TogglePill
            key={option.value}
            active={llmReviewFilter === option.value}
            onClick={() => onChange(option.value)}
          >
            {displayLlmLabel(option)}
          </TogglePill>
        ))}
      </FilterBar>
    </div>
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
      <div className="relative min-w-[200px] flex-1">
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
    <div className="animate-in slide-in-from-top-2 duration-200 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 shadow-sm sm:px-4">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          size="sm"
          className="min-h-[44px] gap-1.5 bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary)]/90"
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
