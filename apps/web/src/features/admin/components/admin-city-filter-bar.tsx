import { cn } from "@/lib/utils"
import { UNASSIGNED_CITY_KEY, type CityFilterValue } from "@/lib/events/group-by-city"
import { FilterBar } from "@/components/v2"
import type { City } from "@/lib/types"

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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[36px] shrink-0 snap-start items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:bg-accent"
      )}
    >
      {label}
      <span className="opacity-70">({count.toLocaleString()})</span>
    </button>
  )
}
