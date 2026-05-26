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

function getDayFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dayFormattersByTimeZone.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", { ...dayFormatterOptions, timeZone })
    dayFormattersByTimeZone.set(timeZone, formatter)
  }
  return formatter
}

export function formatDayKey(date: Date, timeZone: string): string {
  return getDayFormatter(timeZone).format(date)
}

export function getHourFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = hourFormattersByTimeZone.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { ...hourFormatterOptions, timeZone })
    hourFormattersByTimeZone.set(timeZone, formatter)
  }
  return formatter
}
