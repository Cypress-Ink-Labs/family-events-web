import type { ElementType } from "react"
import {
  ChevronDown,
  Circle as XCircle,
  CircleCheck as CheckCircle,
  Clock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  TriangleAlert as AlertTriangle,
} from "lucide-react"
import { formatLastRun } from "@/shared/utils/dates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { groupByCity, UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import { FormGrid, Toolbar } from "@/components/v2"
import {
  ADMIN_SOURCE_TYPE_LABELS,
  ADMIN_SOURCE_TYPE_OPTIONS,
  type AdminSourceType,
  getAdminSourceIcon,
} from "@/features/admin/constants/source-types"
import { SOURCE_HEALTH_TEXT_CLASS, type SourceHealthStatus } from "@/shared/constants/status-colors"
import type { City, EventProcessingMode, EventSource, ExtractionMode } from "@/lib/types"

export interface SourceDraft {
  name: string
  url: string
  source_type: AdminSourceType
  extraction_mode: ExtractionMode
  processing_mode: EventProcessingMode
  city_id: string
}

const SOURCE_HEALTH_VALUES: SourceHealthStatus[] = ["pending", "success", "error", "partial"]

function getSourceStatus(lastStatus: string | null | undefined): SourceHealthStatus {
  if (lastStatus && SOURCE_HEALTH_VALUES.includes(lastStatus as SourceHealthStatus)) {
    return lastStatus as SourceHealthStatus
  }
  return "pending"
}

const SOURCE_HEALTH_BADGE: Record<SourceHealthStatus, { icon: ElementType; label: string }> = {
  success: { icon: CheckCircle, label: "Healthy" },
  error: { icon: XCircle, label: "Error" },
  partial: { icon: AlertTriangle, label: "Partial" },
  pending: { icon: Clock, label: "Pending" },
}

function StatusIndicator({ status }: { status: SourceHealthStatus }) {
  const config = SOURCE_HEALTH_BADGE[status]
  return (
    <div className={cn("inline-flex items-center gap-1", SOURCE_HEALTH_TEXT_CLASS[status])}>
      <config.icon className="size-3.5" />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  )
}

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

interface AddSourceDialogProps {
  open: boolean
  cities: City[]
  newSource: SourceDraft
  onOpenChange: (open: boolean) => void
  onSourceDraftPatch: (patch: Partial<SourceDraft>) => void
  onAddSource: () => void
}

function AddSourceDialog({
  open,
  cities,
  newSource,
  onOpenChange,
  onSourceDraftPatch,
  onAddSource,
}: AddSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="min-h-[44px] gap-2">
          <Plus className="size-4" />
          <span>Add Source</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Event Source</DialogTitle>
          <DialogDescription>
            Create a source, then trigger a scrape to import events into the review queue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-source-name">Source Name</Label>
            <Input
              id="new-source-name"
              value={newSource.name}
              onChange={(event) => onSourceDraftPatch({ name: event.target.value })}
              placeholder="e.g. NYC Parks Family Events"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-source-url">URL</Label>
            <Input
              id="new-source-url"
              value={newSource.url}
              onChange={(event) => onSourceDraftPatch({ url: event.target.value })}
              placeholder="https://..."
            />
          </div>
          <FormGrid cols={2} gap="3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={newSource.source_type}
                onValueChange={(value) =>
                  onSourceDraftPatch({ source_type: value as AdminSourceType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_SOURCE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Extraction</Label>
              <Select
                value={newSource.extraction_mode}
                onValueChange={(value) =>
                  onSourceDraftPatch({ extraction_mode: value as ExtractionMode })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deterministic">Parser</SelectItem>
                  <SelectItem value="deterministic_then_llm">Parser + LLM</SelectItem>
                  <SelectItem value="llm">LLM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormGrid>
          <FormGrid cols={2} gap="3">
            <div className="space-y-1.5">
              <Label>Processing</Label>
              <Select
                value={newSource.processing_mode}
                onValueChange={(value) =>
                  onSourceDraftPatch({ processing_mode: value as EventProcessingMode })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_review">Manual review</SelectItem>
                  <SelectItem value="auto_approve">Auto approve</SelectItem>
                  <SelectItem value="llm_review">LLM review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Select
                value={newSource.city_id}
                onValueChange={(value) => onSourceDraftPatch({ city_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormGrid>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onAddSource}>Add Source</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AdminSourcesListProps {
  sources: EventSource[]
  cities: City[]
  cityFilter: CityFilterValue
  latestErrorBySourceId: ReadonlyMap<string, string>
  scrapingSourceIds: Set<string>
  onToggleActive: (sourceId: string, isActive: boolean) => void
  onSetProcessingMode: (sourceId: string, mode: EventProcessingMode) => void
  onScrape: (sourceId: string) => void
  onAddSourceForCity: (cityId: string) => void
}

export function AdminSourcesList({
  sources,
  cities,
  cityFilter,
  latestErrorBySourceId,
  scrapingSourceIds,
  onToggleActive,
  onSetProcessingMode,
  onScrape,
  onAddSourceForCity,
}: AdminSourcesListProps) {
  if (cityFilter !== "all") {
    const filtered =
      cityFilter === UNASSIGNED_CITY_KEY
        ? sources.filter((source) => source.city_id === null)
        : sources.filter((source) => source.city_id === cityFilter)

    return (
      <div className="space-y-3">
        {filtered.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            cities={cities}
            errorMessage={latestErrorBySourceId.get(source.id)}
            scrapingSourceIds={scrapingSourceIds}
            onToggleActive={onToggleActive}
            onSetProcessingMode={onSetProcessingMode}
            onScrape={onScrape}
          />
        ))}
      </div>
    )
  }

  const groups = groupByCity(sources, cities)
  return (
    <div className="space-y-3">
      {groups.map((group) => {
        if (group.items.length === 0) {
          if (group.key === UNASSIGNED_CITY_KEY) return null
          return (
            <EmptyCityCard
              key={group.key}
              label={group.label}
              onAddSource={() => onAddSourceForCity(group.key)}
            />
          )
        }
        return (
          <Collapsible key={group.key} defaultOpen={false}>
            <Card className="border-border/60">
              <CollapsibleTrigger className="group w-full">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                    <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {group.items.length}
                    </Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 border-t border-border/60 p-3">
                  {group.items.map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      cities={cities}
                      errorMessage={latestErrorBySourceId.get(source.id)}
                      scrapingSourceIds={scrapingSourceIds}
                      onToggleActive={onToggleActive}
                      onSetProcessingMode={onSetProcessingMode}
                      onScrape={onScrape}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}
    </div>
  )
}

interface SourceCardProps {
  source: EventSource
  cities: City[]
  errorMessage?: string
  scrapingSourceIds: Set<string>
  onToggleActive: (sourceId: string, isActive: boolean) => void
  onSetProcessingMode: (sourceId: string, mode: EventProcessingMode) => void
  onScrape: (sourceId: string) => void
}

function SourceCard({
  source,
  cities,
  errorMessage,
  scrapingSourceIds,
  onToggleActive,
  onSetProcessingMode,
  onScrape,
}: SourceCardProps) {
  const TypeIcon = getAdminSourceIcon(source.source_type)
  const cityLabel = cities.find((city) => city.id === source.city_id)?.name ?? "Unassigned"
  const safeStatus = getSourceStatus(source.last_status)
  const sourceTypeLabel =
    ADMIN_SOURCE_TYPE_LABELS[source.source_type as AdminSourceType] ?? source.source_type
  const lastRunDate = source.last_scraped_at ? new Date(source.last_scraped_at) : null
  const isScraping = scrapingSourceIds.has(source.id)

  return (
    <Card className="@container/src-card border-border/60">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <TypeIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{source.name}</h3>
              <Badge variant="outline" className="text-[10px] capitalize">
                {sourceTypeLabel}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{cityLabel}</span>
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{source.url}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <StatusIndicator status={safeStatus} />
          {lastRunDate ? <span>Last run {formatLastRun(lastRunDate)}</span> : null}
          {source.error_count > 0 ? (
            <span className="text-destructive">{source.error_count} errors</span>
          ) : null}
        </div>

        {safeStatus === "error" && errorMessage ? (
          <p className="line-clamp-2 text-xs text-destructive/80" title={errorMessage}>
            {errorMessage}
          </p>
        ) : null}

        {/* Controls row: collapses to two-col grid on narrow card, single-row on wider. */}
        <div className="grid grid-cols-1 gap-2 border-t border-border/60 pt-3 @[480px]/src-card:grid-cols-[auto_auto_1fr] @[480px]/src-card:items-center @[480px]/src-card:gap-4">
          <label
            htmlFor={`source-${source.id}-active`}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2"
          >
            <Switch
              id={`source-${source.id}-active`}
              checked={source.is_active}
              onCheckedChange={(checked) => onToggleActive(source.id, checked)}
              aria-label={`Toggle ${source.name} active`}
            />
            <span className="text-xs text-muted-foreground">Active</span>
          </label>
          <div className={cn("space-y-1", !source.is_active && "opacity-40")}>
            <span className="text-[11px] text-muted-foreground">Processing</span>
            <Select
              value={source.processing_mode}
              disabled={!source.is_active}
              onValueChange={(value) =>
                onSetProcessingMode(source.id, value as EventProcessingMode)
              }
            >
              <SelectTrigger className="h-9 min-h-[44px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual_review">Manual review</SelectItem>
                <SelectItem value="auto_approve">Auto approve</SelectItem>
                <SelectItem value="llm_review">LLM review</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground capitalize">
              Extraction: {source.extraction_mode.replaceAll("_", " ")}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] gap-1.5 text-xs @[480px]/src-card:ml-auto @[480px]/src-card:w-auto"
            disabled={isScraping || !source.is_active}
            onClick={() => onScrape(source.id)}
          >
            <RefreshCw className={cn("size-3.5", isScraping && "animate-spin")} />
            {isScraping ? "Running..." : "Scrape Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface EmptyCityCardProps {
  label: string
  onAddSource: () => void
}

function EmptyCityCard({ label, onAddSource }: EmptyCityCardProps) {
  return (
    <Card className="border-dashed border-border/60 bg-muted/20">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No sources yet. Add one to start ingesting events for this city.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] shrink-0 gap-1.5"
            onClick={onAddSource}
          >
            <Plus className="size-3.5" />
            Add source
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
