import type { ElementType } from "react"
import {
  Calendar,
  ChevronDown,
  Circle as XCircle,
  CircleCheck as CheckCircle,
  Clock,
  FileText,
  Globe,
  HelpCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Rss,
  TriangleAlert as AlertTriangle,
} from "lucide-react"
import { format, isToday, isThisYear } from "date-fns"
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
import { groupByCity, UNASSIGNED_CITY_KEY } from "@/lib/group-by-city"
import { FormGrid, Toolbar } from "@/components/v2"
import type { CityFilterValue } from "@/features/admin/hooks/use-city-filter"
import type { City, EventSource } from "@/lib/types"

type SourceType = "website" | "ical" | "rss" | "manual"
type SourceStatus = "pending" | "success" | "error" | "partial"

const SOURCE_TYPE_ICONS: Record<SourceType, ElementType> = {
  website: Globe,
  rss: Rss,
  ical: Calendar,
  manual: FileText,
}

function getSourceIcon(sourceType: string): ElementType {
  return SOURCE_TYPE_ICONS[sourceType as SourceType] ?? HelpCircle
}

function getSourceStatus(lastStatus: string | null | undefined): SourceStatus {
  const validStatuses: SourceStatus[] = ["pending", "success", "error", "partial"]
  if (lastStatus && validStatuses.includes(lastStatus as SourceStatus)) {
    return lastStatus as SourceStatus
  }
  return "pending"
}

function formatLastRunCompact(date: Date): string {
  if (isToday(date)) return format(date, "h:mma").toLowerCase()
  if (isThisYear(date)) return format(date, "M/d h:mma").toLowerCase()
  return format(date, "M/d/yy")
}

function StatusIndicator({ status }: { status: SourceStatus }) {
  const config = {
    success: { icon: CheckCircle, color: "text-green-600", label: "Healthy" },
    error: { icon: XCircle, color: "text-destructive", label: "Error" },
    partial: { icon: AlertTriangle, color: "text-amber-500", label: "Partial" },
    pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  }[status]

  return (
    <div className={cn("inline-flex items-center gap-1", config.color)}>
      <config.icon className="size-3.5" />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  )
}

interface AdminSourcesHeaderProps {
  activeSourceCount: number
  cities: City[]
  dialogOpen: boolean
  newSource: {
    name: string
    url: string
    source_type: SourceType
    city_id: string
  }
  isBulkPending: boolean
  onDialogOpenChange: (open: boolean) => void
  onNameChange: (value: string) => void
  onUrlChange: (value: string) => void
  onTypeChange: (value: SourceType) => void
  onCityChange: (value: string) => void
  onAddSource: () => void
  onEnableAllAutoApprove: () => void
  onDisableAllAutoApprove: () => void
}

export function AdminSourcesHeader({
  activeSourceCount,
  cities,
  dialogOpen,
  newSource,
  isBulkPending,
  onDialogOpenChange,
  onNameChange,
  onUrlChange,
  onTypeChange,
  onCityChange,
  onAddSource,
  onEnableAllAutoApprove,
  onDisableAllAutoApprove,
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
                disabled={isBulkPending}
                aria-label="Bulk actions"
              >
                <MoreHorizontal className="size-4" />
                <span className="hidden sm:inline">Bulk</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onEnableAllAutoApprove} disabled={isBulkPending}>
                Auto-Approve All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDisableAllAutoApprove} disabled={isBulkPending}>
                Disable Auto-Approve All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
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
                  <Label>Source Name</Label>
                  <Input
                    value={newSource.name}
                    onChange={(event) => onNameChange(event.target.value)}
                    placeholder="e.g. NYC Parks Family Events"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>URL</Label>
                  <Input
                    value={newSource.url}
                    onChange={(event) => onUrlChange(event.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <FormGrid cols={2} gap="3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={newSource.source_type}
                      onValueChange={(value) => onTypeChange(value as SourceType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="ical">iCal Feed</SelectItem>
                        <SelectItem value="rss">RSS Feed</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Select value={newSource.city_id} onValueChange={onCityChange}>
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
                <Button variant="outline" onClick={() => onDialogOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={onAddSource}>Add Source</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      }
    />
  )
}

interface AdminSourcesListProps {
  sources: EventSource[]
  cities: City[]
  cityFilter: CityFilterValue
  latestErrorBySourceId: ReadonlyMap<string, string>
  scrapingSourceIds: Set<string>
  onToggleActive: (sourceId: string, isActive: boolean) => void
  onToggleAutoApprove: (sourceId: string, autoApprove: boolean) => void
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
  onToggleAutoApprove,
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
            onToggleAutoApprove={onToggleAutoApprove}
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
                      onToggleAutoApprove={onToggleAutoApprove}
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
  onToggleAutoApprove: (sourceId: string, autoApprove: boolean) => void
  onScrape: (sourceId: string) => void
}

function SourceCard({
  source,
  cities,
  errorMessage,
  scrapingSourceIds,
  onToggleActive,
  onToggleAutoApprove,
  onScrape,
}: SourceCardProps) {
  const TypeIcon = getSourceIcon(source.source_type)
  const cityLabel = cities.find((city) => city.id === source.city_id)?.name ?? "Unassigned"
  const safeStatus = getSourceStatus(source.last_status)
  const lastRunDate = source.last_scraped_at ? new Date(source.last_scraped_at) : null
  const isScraping = scrapingSourceIds.has(source.id)

  return (
    <Card className="@container/src-card border-border/60">
      <CardContent className="space-y-3 p-4">
        {/* Identity row: icon + title + meta. Always vertical-friendly. */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <TypeIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{source.name}</h3>
              <Badge variant="outline" className="text-[10px] capitalize">
                {source.source_type}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{cityLabel}</span>
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{source.url}</p>
          </div>
        </div>

        {/* Status row: status + last-run + error count. Compact metadata. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <StatusIndicator status={safeStatus} />
          {lastRunDate ? <span>Last run {formatLastRunCompact(lastRunDate)}</span> : null}
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
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2">
            <Switch
              checked={source.is_active}
              onCheckedChange={(checked) => onToggleActive(source.id, checked)}
              aria-label={`Toggle ${source.name} active`}
            />
            <span className="text-xs text-muted-foreground">Active</span>
          </label>
          <label
            className={cn(
              "inline-flex min-h-[44px] cursor-pointer items-center gap-2",
              !source.is_active && "pointer-events-none opacity-40"
            )}
            title={!source.is_active ? "Enable the source to configure auto-approve" : undefined}
          >
            <Switch
              checked={source.auto_approve}
              disabled={!source.is_active}
              onCheckedChange={(checked) => onToggleAutoApprove(source.id, checked)}
              aria-label={`Toggle ${source.name} auto-approve`}
            />
            <span className="text-xs text-muted-foreground">Auto-approve</span>
          </label>
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
