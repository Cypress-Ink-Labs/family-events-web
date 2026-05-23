import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { Sentry } from "@/lib/platform/sentry"

const OPENWEATHER_ENDPOINT = "https://api.openweathermap.org/data/2.5/weather"

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
const WEATHER_MAX_ATTEMPTS = 3
let didReportInvalidWeatherKey = false

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500
}

function readWeatherApiKey(): string | undefined {
  const value = import.meta.env.VITE_OPENWEATHER_API_KEY
  return typeof value === "string" && value.trim().length > 0 ? value : undefined
}

async function fetchWeatherSnapshot(
  latitude: number,
  longitude: number,
  apiKey: string
): Promise<WeatherSnapshot | null> {
  const endpoint = new URL(OPENWEATHER_ENDPOINT)
  endpoint.searchParams.set("lat", String(latitude))
  endpoint.searchParams.set("lon", String(longitude))
  endpoint.searchParams.set("appid", apiKey)
  endpoint.searchParams.set("units", "metric")

  async function attemptFetch(attempt: number): Promise<WeatherSnapshot | null> {
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" } })
      if (!response.ok) {
        if ((response.status === 401 || response.status === 403) && !didReportInvalidWeatherKey) {
          didReportInvalidWeatherKey = true
          if (import.meta.env.DEV) {
            console.warn("[weather] OpenWeather API key rejected; falling back to city/date strip")
          }
          Sentry.captureException(new Error("OpenWeather API key rejected"), {
            tags: { scope: "weather" },
            extra: { status: response.status },
          })
        }
        if (attempt < WEATHER_MAX_ATTEMPTS - 1 && shouldRetry(response.status)) {
          await sleep((attempt + 1) * 250)
          return attemptFetch(attempt + 1)
        }
        return null
      }

      const payload = await response.json()
      const condition =
        typeof payload?.weather?.[0]?.main === "string" ? payload.weather[0].main : null
      const temperatureC = typeof payload?.main?.temp === "number" ? payload.main.temp : null
      const observedAt =
        typeof payload?.dt === "number" ? new Date(payload.dt * 1000).toISOString() : null

      return {
        condition,
        temperatureC,
        observedAt,
        weatherFit: weatherFitFromConditions(condition, temperatureC),
      }
    } catch {
      if (attempt < WEATHER_MAX_ATTEMPTS - 1) {
        await sleep((attempt + 1) * 250)
        return attemptFetch(attempt + 1)
      }
      return null
    }
  }

  return attemptFetch(0)
}

export function useWeather(options: UseWeatherOptions = {}) {
  const { latitude, longitude, enabled = true } = options
  const apiKey = readWeatherApiKey()

  return useQuery({
    queryKey: qk.weather.byCoordinates(latitude, longitude),
    queryFn: async () => {
      if (!apiKey || latitude == null || longitude == null) {
        return null
      }
      return fetchWeatherSnapshot(latitude, longitude, apiKey)
    },
    enabled: enabled && Boolean(apiKey) && latitude != null && longitude != null,
    staleTime: WEATHER_STALE_MS,
    gcTime: WEATHER_STALE_MS,
    retry: false,
  })
}
