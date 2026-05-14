import { cn } from "@/lib/utils"
import { UNASSIGNED_CITY_KEY } from "@/lib/group-by-city"
import type { City } from "@/lib/types"
import type { CityFilterValue } from "@/features/admin/hooks/use-city-filter"

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
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
        City
      </span>
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
        "text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:bg-accent"
      )}
    >
      {label}
      <span className="ml-1 opacity-70">({count})</span>
    </button>
  )
}
