import { useCallback } from "react"
import { MapPin } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/format"
import { useExploreStore, type LocationState } from "@/features/explore/stores/explore-store"
import { useApp } from "@/app/stores/app-store"
import { toast } from "sonner"

const RADIUS_OPTIONS = [5, 10, 25, 50] as const

/**
 * 'Near me' toggle + radius selector for the explore filter bar.
 * Triggers geolocation on first enable; falls back to city center if denied.
 */
export function RadiusFilter() {
  const nearMeEnabled = useExploreStore((s) => s.nearMeEnabled)
  const radiusKm = useExploreStore((s) => s.radiusKm)
  const location = useExploreStore((s) => s.location)
  const setNearMeEnabled = useExploreStore((s) => s.setNearMeEnabled)
  const setRadiusKm = useExploreStore((s) => s.setRadiusKm)
  const setLocation = useExploreStore((s) => s.setLocation)
  const { selectedCity } = useApp()

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      // No geolocation support — fall back to city center
      applyCityFallback()
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: LocationState = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "gps",
        }
        setLocation(loc)
        setNearMeEnabled(true)
      },
      () => {
        // Denied or error — fall back to city center
        applyCityFallback()
      },
      { enableHighAccuracy: false, timeout: 10000 }
    )
  }, [selectedCity, setLocation, setNearMeEnabled])

  function applyCityFallback() {
    if (selectedCity?.latitude != null && selectedCity?.longitude != null) {
      const loc: LocationState = {
        lat: selectedCity.latitude,
        lng: selectedCity.longitude,
        source: "city-center",
      }
      setLocation(loc)
      setNearMeEnabled(true)
      toast.info("Using city center as location")
    } else {
      toast.error("Location unavailable. Select a city first.")
    }
  }

  const handleToggle = useCallback(() => {
    if (nearMeEnabled) {
      setNearMeEnabled(false)
      return
    }
    // If we already have a location, just re-enable
    if (location) {
      setNearMeEnabled(true)
      return
    }
    requestLocation()
  }, [nearMeEnabled, location, requestLocation, setNearMeEnabled])

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant={nearMeEnabled ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        className={cn(
          "gap-1.5 h-8 text-xs font-medium rounded-full",
          nearMeEnabled && "bg-primary text-primary-foreground"
        )}
      >
        <MapPin className="size-3.5" />
        Near me
      </Button>
      {nearMeEnabled && (
        <div className="flex items-center gap-0.5">
          {RADIUS_OPTIONS.map((km) => (
            <button
              type="button"
              key={km}
              onClick={() => setRadiusKm(km)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150",
                radiusKm === km
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {km}km
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
