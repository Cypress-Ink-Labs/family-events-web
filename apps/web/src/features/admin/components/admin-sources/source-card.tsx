import { RefreshCw } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Switch } from "@/shared/components/ui/switch"
import { cn, formatSlugLabel } from "@/shared/utils/format"
import { formatLastRun } from "@/shared/utils/dates"
import {
  ADMIN_SOURCE_TYPE_LABELS,
  type AdminSourceType,
  getAdminSourceIcon,
} from "@/features/admin/constants/source-types"
import type { City, EventProcessingMode, EventSource } from "@/shared/types"
import {
  getSourceHealthStatus,
  SourceStatusIndicator,
} from "@/features/admin/components/admin-sources/status-indicator"

interface SourceCardProps {
  source: EventSource
  cities: City[]
  errorMessage?: string
  scrapingSourceIds: Set<string>
  onToggleActive: (sourceId: string, isActive: boolean) => void
  onSetProcessingMode: (sourceId: string, mode: EventProcessingMode) => void
  onScrape: (sourceId: string) => void
}

export function SourceCard({
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
  const safeStatus = getSourceHealthStatus(source.last_status)
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
              <Badge variant="outline" className="text-[10px]">
                {sourceTypeLabel}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{cityLabel}</span>
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{source.url}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <SourceStatusIndicator status={safeStatus} />
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
          <Label
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
          </Label>
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
            <span className="text-[10px] text-muted-foreground">
              Extraction: {formatSlugLabel(source.extraction_mode)}
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

export type { SourceCardProps }
