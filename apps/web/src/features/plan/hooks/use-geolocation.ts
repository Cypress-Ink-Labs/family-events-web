import { useEffect, useMemo, useReducer } from "react"
import type { City } from "@/lib/types"

type GeolocationSource = "browser" | "city-centroid" | "none"
type GeolocationStatus = "idle" | "resolving" | "granted" | "fallback"

export interface GeolocationResult {
  latitude: number | null
  longitude: number | null
  source: GeolocationSource
  status: GeolocationStatus
}

interface UseGeolocationOptions {
  selectedCity?: City | null
  enabled?: boolean
  timeoutMs?: number
}

const DEFAULT_GEO_TIMEOUT_MS = 3_500

function cityCentroid(
  selectedCity?: City | null
): Pick<GeolocationResult, "latitude" | "longitude"> {
  return {
    latitude: selectedCity?.latitude ?? null,
    longitude: selectedCity?.longitude ?? null,
  }
}

function asFallbackResult(selectedCity?: City | null): GeolocationResult {
  const centroid = cityCentroid(selectedCity)
  return {
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    source: centroid.latitude != null && centroid.longitude != null ? "city-centroid" : "none",
    status: "fallback",
  }
}

type GeolocationAction = GeolocationResult | ((state: GeolocationResult) => GeolocationResult)

function geolocationReducer(
  state: GeolocationResult,
  action: GeolocationAction
): GeolocationResult {
  return typeof action === "function" ? action(state) : action
}

export function useGeolocation(options: UseGeolocationOptions = {}): GeolocationResult {
  const { selectedCity, enabled = true, timeoutMs = DEFAULT_GEO_TIMEOUT_MS } = options

  const fallbackResult = useMemo(() => asFallbackResult(selectedCity), [selectedCity])
  const [state, dispatch] = useReducer(geolocationReducer, undefined, () =>
    enabled ? { ...fallbackResult, status: "resolving" as const } : fallbackResult
  )

  useEffect(() => {
    if (!enabled) {
      dispatch(fallbackResult)
      return
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      dispatch(fallbackResult)
      return
    }

    dispatch((current) => ({ ...current, status: "resolving" }))

    let isClosed = false
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (isClosed) {
          return
        }
        dispatch({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "browser",
          status: "granted",
        })
      },
      () => {
        // Decision 10A: geolocation errors are silent; we degrade to centroid/no-geo.
        if (isClosed) {
          return
        }
        dispatch(fallbackResult)
      },
      {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: 60_000,
      }
    )

    return () => {
      isClosed = true
    }
  }, [enabled, fallbackResult, timeoutMs])

  return state
}
