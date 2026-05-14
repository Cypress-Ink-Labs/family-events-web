// Buckets an event's start time into one of three urgency levels. Drives the
// pin color/animation: today pops with a pulse, this-week is the default
// brand color, anything further out fades back so eyes can triage at-a-glance.
export type DateBucket = "today" | "soon" | "future"

export function dateBucket(start: string | Date, now: Date = new Date()): DateBucket {
  const startDate = typeof start === "string" ? new Date(start) : start
  const startMs = startDate.getTime()
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const endOfTodayMs = startOfTodayMs + 24 * 60 * 60 * 1000
  if (startMs < endOfTodayMs && startMs >= startOfTodayMs) return "today"
  const sevenDaysOutMs = startOfTodayMs + 7 * 24 * 60 * 60 * 1000
  if (startMs < sevenDaysOutMs) return "soon"
  return "future"
}

// Haversine — great-circle distance in km. Accurate enough for "how far is
// this venue from me" UI labels; the underlying earth-isn't-a-sphere error is
// well under a percent for the distances anyone will see in a single city.
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function formatDistance(km: number, unit: "mi" | "km" = "mi"): string {
  if (unit === "mi") {
    const mi = km * 0.621371
    if (mi < 0.1) return "< 0.1 mi"
    if (mi < 10) return `${mi.toFixed(1)} mi`
    return `${Math.round(mi)} mi`
  }
  if (km < 0.1) return "< 0.1 km"
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

// Universal "open this venue in maps" URL. Works on iOS Safari (handed off to
// Apple Maps), Android, and desktop browsers — Google's docs guarantee the
// dir API redirects to the OS map app when one is registered.
export function directionsUrl(lat: number, lng: number, label?: string): string {
  const dest = `${lat},${lng}`
  const params = new URLSearchParams({ api: "1", destination: dest })
  if (label) params.set("destination_place_id", label)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
