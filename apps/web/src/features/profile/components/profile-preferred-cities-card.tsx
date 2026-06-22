import { useMemo, useState } from "react"
import { MapPin, Plus, Star, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import type { City } from "@/shared/types"

interface ProfilePreferredCitiesCardProps {
  /** All active cities, used to populate the picker and resolve names. */
  cities: City[]
  /** City IDs the user currently has selected (server-resolved draft seed). */
  selectedCityIds: string[]
  /** The single primary city ID, or null when nothing is selected yet. */
  primaryCityId: string | null
  isCitiesLoading: boolean
  isSaving: boolean
  onAddCity: (cityId: string) => void
  onRemoveCity: (cityId: string) => void
  onSetPrimary: (cityId: string) => void
  onSave: () => void
  /** True when the draft differs from the persisted set. Disables Save when false. */
  isDirty: boolean
}

export function ProfilePreferredCitiesCard({
  cities,
  selectedCityIds,
  primaryCityId,
  isCitiesLoading,
  isSaving,
  onAddCity,
  onRemoveCity,
  onSetPrimary,
  onSave,
  isDirty,
}: ProfilePreferredCitiesCardProps) {
  const [pickerValue, setPickerValue] = useState("")

  const cityById = useMemo(() => {
    const map = new Map<string, City>()
    for (const city of cities) map.set(city.id, city)
    return map
  }, [cities])

  const availableCities = useMemo(
    () => cities.filter((city) => !selectedCityIds.includes(city.id)),
    [cities, selectedCityIds]
  )

  function handleAdd(cityId: string) {
    onAddCity(cityId)
    // Reset the trigger label back to the placeholder after a selection.
    setPickerValue("")
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          Preferred Cities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pick the cities you want events from. Star one as your primary — it powers your default
          view and weekend digest.
        </p>

        <ul className="space-y-2">
          {selectedCityIds.length === 0 && (
            <li className="text-sm text-muted-foreground">No cities selected yet.</li>
          )}
          {selectedCityIds.map((cityId) => {
            const city = cityById.get(cityId)
            const isPrimary = cityId === primaryCityId
            return (
              <li
                key={cityId}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="text-sm font-medium text-foreground">
                  {city ? `${city.name}, ${city.state}` : cityId}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant={isPrimary ? "default" : "ghost"}
                    aria-pressed={isPrimary}
                    aria-label={isPrimary ? "Primary city" : "Set as primary city"}
                    title={isPrimary ? "Primary city" : "Set as primary"}
                    disabled={isSaving}
                    onClick={() => onSetPrimary(cityId)}
                  >
                    <Star className={isPrimary ? "fill-current" : ""} />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${city ? city.name : cityId}`}
                    title="Remove city"
                    disabled={isSaving}
                    onClick={() => onRemoveCity(cityId)}
                  >
                    <X />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="space-y-1.5">
          <Label>Add a city</Label>
          <Select
            value={pickerValue}
            onValueChange={handleAdd}
            disabled={isCitiesLoading || availableCities.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isCitiesLoading
                    ? "Loading cities..."
                    : availableCities.length === 0
                      ? "All cities added"
                      : "Select a city to add"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableCities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}, {city.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onSave} disabled={isSaving || !isDirty || selectedCityIds.length === 0}>
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <Plus className="size-4" />
              Save Cities
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
