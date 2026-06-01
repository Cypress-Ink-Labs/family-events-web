import { UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import { FilterBar } from "@/components/v2"
import { TogglePill } from "@/shared/components/ui/toggle-pill"
import type { City } from "@/shared/types"

interface CityCount {
  key: string
  label: string
  count: number
}

interface AdminCityFilterBarProps {
  cities: City[]
  counts: Record<string, number>
  total: number
  value: CityFilterValue
  onChange: (value: CityFilterValue) => void
}

export function AdminCityFilterBar({
  cities,
  counts,
  total,
  value,
  onChange,
}: AdminCityFilterBarProps) {
  const cityChips: CityCount[] = cities.map((city) => ({
    key: city.id,
    label: city.name,
    count: counts[city.id] ?? 0,
  }))

  const unassignedCount = counts[UNASSIGNED_CITY_KEY] ?? 0
  if (unassignedCount > 0 || value === UNASSIGNED_CITY_KEY) {
    cityChips.push({ key: UNASSIGNED_CITY_KEY, label: "Unassigned", count: unassignedCount })
  }

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        City
      </span>
      <FilterBar>
        <CityChip
          label="All"
          count={total}
          active={value === "all"}
          onClick={() => onChange("all")}
        />
        {cityChips.map((chip) => (
          <CityChip
            key={chip.key}
            label={chip.label}
            count={chip.count}
            active={value === chip.key}
            onClick={() => onChange(chip.key)}
          />
        ))}
      </FilterBar>
    </div>
  )
}

interface CityChipProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function CityChip({ label, count, active, onClick }: CityChipProps) {
  return (
    <TogglePill active={active} onClick={onClick}>
      {label}
      <span className="opacity-70">({count.toLocaleString()})</span>
    </TogglePill>
  )
}
