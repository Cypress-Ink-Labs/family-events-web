import { format } from "date-fns"
import { CloudSun } from "lucide-react"
import type { WeatherSnapshot } from "@/features/plan/hooks/use-weather"

interface WeatherStripProps {
  date: string | null
  cityName: string | null | undefined
  weather: WeatherSnapshot | null | undefined
}

function asDisplayDate(date: string | null): Date {
  if (!date) {
    return new Date()
  }
  // Use midday UTC to avoid timezone rollover in local formatting.
  return new Date(`${date}T12:00:00.000Z`)
}

function weatherDetails(weather: WeatherSnapshot | null | undefined): string | null {
  if (!weather || weather.temperatureC == null || !weather.condition) {
    return null
  }

  const fahrenheit = Math.round((weather.temperatureC * 9) / 5 + 32)
  return `${fahrenheit}F · ${weather.condition.toLowerCase()}`
}

export function WeatherStrip({ date, cityName, weather }: WeatherStripProps) {
  const dateLabel = format(asDisplayDate(date), "EEEE, MMM d")
  const cityLabel = cityName?.trim() || "Your city"
  const details = weatherDetails(weather)

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground">
      <CloudSun className="h-3.5 w-3.5 text-primary" />
      <span>{details ? `${dateLabel} · ${details}` : `${dateLabel} · ${cityLabel}`}</span>
    </div>
  )
}
