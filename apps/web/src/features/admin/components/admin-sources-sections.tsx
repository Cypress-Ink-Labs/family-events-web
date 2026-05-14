import type { ElementType } from "react"
import {
  Calendar,
  Circle as XCircle,
  CircleCheck as CheckCircle,
  Clock,
  FileText,
  Globe,
  HelpCircle,
  Plus,
  RefreshCw,
  Rss,
  TriangleAlert as AlertTriangle,
} from "lucide-react"
import { format } from "date-fns"
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
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { groupByCity, UNASSIGNED_CITY_KEY } from "@/lib/group-by-city"
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

function StatusIndicator({ status }: { status: SourceStatus }) {
  const config = {
    success: { icon: CheckCircle, color: "text-green-600", label: "Healthy" },
    error: { icon: XCircle, color: "text-destructive", label: "Error" },
    partial: { icon: AlertTriangle, color: "text-amber-500", label: "Partial" },
    pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  }[status]

  return (
    <div className={`flex items-center gap-1 ${config.color}`}>
      <config.icon className="h-3.5 w-3.5" />
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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Event Sources</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{activeSourceCount} active sources</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isBulkPending}
          onClick={onEnableAllAutoApprove}
        >
          Auto-Approve All
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isBulkPending}
          onClick={onDisableAllAutoApprove}
        >
          Disable Auto-Approve All
        </Button>
        <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Source
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
              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onAddSource}>Add Source</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
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
              <CollapsibleTrigger className="w-full group">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                    <h3 className="font-semibold text-sm text-foreground">{group.label}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {group.items.length}
                    </Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border/60 p-3 space-y-3">
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

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <TypeIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground">{source.name}</h3>
              <Badge variant="outline" className="text-[10px] capitalize">
                {source.source_type}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{cityLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{source.url}</p>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <StatusIndicator status={safeStatus} />
              {safeStatus === "error" && (
                <span
                  className="min-w-0 max-w-xl truncate text-xs text-destructive/80"
                  title={errorMessage}
                >
                  {errorMessage ?? "No error detail recorded"}
                </span>
              )}
              {source.last_scraped_at && (
                <span className="text-xs text-muted-foreground">
                  Last run {format(new Date(source.last_scraped_at), "MMM d, h:mm a")}
                </span>
              )}
              {source.error_count > 0 && (
                <span className="text-xs text-destructive">{source.error_count} errors</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Active</span>
              <Switch
                checked={source.is_active}
                onCheckedChange={(checked) => onToggleActive(source.id, checked)}
                aria-label={`Toggle ${source.name} active`}
              />
            </div>
            <div
              className={`flex items-center gap-1.5 ${!source.is_active ? "opacity-40 pointer-events-none" : ""}`}
              title={!source.is_active ? "Enable the source to configure auto-approve" : undefined}
            >
              <span className="text-xs text-muted-foreground">Auto-approve</span>
              <Switch
                checked={source.auto_approve}
                disabled={!source.is_active}
                onCheckedChange={(checked) => onToggleAutoApprove(source.id, checked)}
                aria-label={`Toggle ${source.name} auto-approve`}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              disabled={scrapingSourceIds.has(source.id) || !source.is_active}
              onClick={() => onScrape(source.id)}
            >
              <RefreshCw
                className={cn("h-3 w-3", scrapingSourceIds.has(source.id) && "animate-spin")}
              />
              {scrapingSourceIds.has(source.id) ? "Running..." : "Scrape Now"}
            </Button>
          </div>
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
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              No sources yet — add one to start ingesting events for this city.
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={onAddSource}>
            <Plus className="h-3.5 w-3.5" />
            Add source
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
