import { format, formatDistanceToNow } from "date-fns"
import { useNowMs } from "@/hooks/use-now-ms"

interface ClientDateProps {
  value: string | number | Date | null | undefined
  pattern: string
  fallback?: string
}

interface ClientDistanceToNowProps {
  value: string | number | Date | null | undefined
  addSuffix?: boolean
  fallback?: string
}

function toDate(value: string | number | Date | null | undefined) {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function ClientDate({ value, pattern, fallback = "" }: ClientDateProps) {
  const date = toDate(value)
  const label = date ? format(date, pattern) : fallback

  return <span suppressHydrationWarning>{label}</span>
}

export function ClientDistanceToNow({
  value,
  addSuffix = false,
  fallback = "",
}: ClientDistanceToNowProps) {
  useNowMs(60_000)
  const date = toDate(value)
  const label = date ? formatDistanceToNow(date, { addSuffix }) : fallback

  return <span suppressHydrationWarning>{label}</span>
}
