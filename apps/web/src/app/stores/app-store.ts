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

const useAppStore = create<AppStore>()(
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

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === selectedCityId) ?? cities[0] ?? null,
    [selectedCityId, cities]
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
