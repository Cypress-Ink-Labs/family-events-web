import { useQuery } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { supabase } from "@/infrastructure/supabase/client"

export type WeatherFit = "outdoor" | "indoor" | "any"

export interface WeatherSnapshot {
  temperatureC: number | null
  condition: string | null
  weatherFit: WeatherFit
  observedAt: string | null
}

interface UseWeatherOptions {
  latitude?: number | null
  longitude?: number | null
  enabled?: boolean
}

const WEATHER_STALE_MS = 60 * 60 * 1000

function weatherFitFromConditions(
  condition: string | null,
  temperatureC: number | null
): WeatherFit {
  if (!condition) {
    return "any"
  }

  const lower = condition.toLowerCase()
  if (
    lower.includes("rain") ||
    lower.includes("storm") ||
    lower.includes("snow") ||
    lower.includes("drizzle") ||
    lower.includes("ash") ||
    lower.includes("tornado")
  ) {
    return "indoor"
  }

  if (temperatureC != null && (temperatureC <= 0 || temperatureC >= 33)) {
    return "indoor"
  }

  return "outdoor"
}

async function fetchWeatherSnapshot(
  latitude: number,
  longitude: number
): Promise<WeatherSnapshot | null> {
  // The OpenWeather API key lives server-side in the `weather` edge function;
  // the browser never sees it. supabase-js attaches the anon/auth JWT.
  const { data, error } = await supabase.functions.invoke<{
    temperatureC: number | null
    condition: string | null
    observedAt: string | null
  }>("weather", { body: { lat: latitude, lon: longitude } })

  if (error || !data) {
    return null
  }

  const condition = typeof data.condition === "string" ? data.condition : null
  const temperatureC = typeof data.temperatureC === "number" ? data.temperatureC : null
  const observedAt = typeof data.observedAt === "string" ? data.observedAt : null

  return {
    condition,
    temperatureC,
    observedAt,
    weatherFit: weatherFitFromConditions(condition, temperatureC),
  }
}

export function useWeather(options: UseWeatherOptions = {}) {
  const { latitude, longitude, enabled = true } = options

  return useQuery({
    queryKey: qk.weather.byCoordinates(latitude, longitude),
    queryFn: async () => {
      if (latitude == null || longitude == null) {
        return null
      }
      return fetchWeatherSnapshot(latitude, longitude)
    },
    enabled: enabled && latitude != null && longitude != null,
    staleTime: WEATHER_STALE_MS,
    gcTime: WEATHER_STALE_MS,
    retry: false,
  })
}
