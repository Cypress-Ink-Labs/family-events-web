import { useCallback, useMemo } from "react"
import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import { useShallow } from "zustand/react/shallow"
import type { City } from "@/shared/types"
import { useCities } from "@/shared/hooks/use-cities"

interface AppStore {
  selectedCityId: string | null
  setSelectedCityId: (id: string | null) => void
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set) => ({
        selectedCityId: null,
        setSelectedCityId: (id) => set({ selectedCityId: id }),
      }),
      {
        name: "family-events-app",
        partialize: (s) => ({ selectedCityId: s.selectedCityId }),
      }
    ),
    { name: "app" }
  )
)

export function useApp() {
  const { selectedCityId, setSelectedCityId } = useAppStore(
    useShallow((s) => ({
      selectedCityId: s.selectedCityId,
      setSelectedCityId: s.setSelectedCityId,
    }))
  )
  const { data: cities = [], isLoading: isCitiesLoading } = useCities()

  // Memoize on the id list so callers (geolocation/plan) don't re-key on every
  // render or on each useCities refetch that happens to produce a new array
  // identity with the same content.
  const cityIdsKey = useMemo(() => cities.map((c) => c.id).join(","), [cities])
  const selectedCity = useMemo(
    () => cities.find((c) => c.id === selectedCityId) ?? cities[0] ?? null,
    // cityIdsKey is the stable dep — eslint can't see it depends on cities,
    // but the join makes identity equal across same-content arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCityId, cityIdsKey]
  )
  const setSelectedCity = useCallback(
    (city: City | null) => setSelectedCityId(city?.id ?? null),
    [setSelectedCityId]
  )

  return {
    selectedCity,
    setSelectedCity,
    cities,
    isCitiesLoading,
  }
}
