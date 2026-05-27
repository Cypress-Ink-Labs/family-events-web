// Formatters are constructed at most once per timeZone via the module-scoped
// caches below — not recreated on every call.

const dayFormatterOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}

const hourFormatterOptions: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  hourCycle: "h23",
}

const dayFormattersByTimeZone = new Map<string, Intl.DateTimeFormat>()
const hourFormattersByTimeZone = new Map<string, Intl.DateTimeFormat>()

function getOrCreateFormatter(
  cache: Map<string, Intl.DateTimeFormat>,
  locale: string,
  baseOptions: Intl.DateTimeFormatOptions,
  timeZone: string
): Intl.DateTimeFormat {
  let formatter = cache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...baseOptions, timeZone })
    cache.set(timeZone, formatter)
  }
  return formatter
}

function getDayFormatter(timeZone: string): Intl.DateTimeFormat {
  return getOrCreateFormatter(dayFormattersByTimeZone, "en-CA", dayFormatterOptions, timeZone)
}

export function formatDayKey(date: Date, timeZone: string): string {
  return getDayFormatter(timeZone).format(date)
}

export function getHourFormatter(timeZone: string): Intl.DateTimeFormat {
  return getOrCreateFormatter(hourFormattersByTimeZone, "en-US", hourFormatterOptions, timeZone)
}
