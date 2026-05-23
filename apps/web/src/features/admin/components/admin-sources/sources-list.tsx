import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { groupByCity, UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import type { City, EventProcessingMode, EventSource } from "@/lib/types"
import { EmptyCityCard } from "@/features/admin/components/admin-sources/empty-city-card"
import { SourceCard } from "@/features/admin/components/admin-sources/source-card"

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
