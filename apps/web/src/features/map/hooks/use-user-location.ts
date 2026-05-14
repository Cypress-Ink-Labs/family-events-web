import { useCallback, useState } from "react"

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number
}

type Status = "idle" | "loading" | "granted" | "denied" | "unsupported"

// Opt-in geolocation: we only invoke the browser prompt when the user clicks
// the "Use my location" button. Returns coords + a status enum so the caller
// can render different UI for never-asked vs denied vs success.
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [status, setStatus] = useState<Status>("idle")

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported")
      return
    }
    setStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setStatus("granted")
      },
      () => {
        setStatus("denied")
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    )
  }, [])

  return { location, status, request }
}
