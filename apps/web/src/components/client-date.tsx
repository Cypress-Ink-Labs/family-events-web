import { format, formatDistanceToNow } from "date-fns"
import { useEffect, useState } from "react"

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
  const [label, setLabel] = useState(fallback)

  useEffect(() => {
    const date = toDate(value)
    setLabel(date ? format(date, pattern) : fallback)
  }, [fallback, pattern, value])

  return <span suppressHydrationWarning>{label}</span>
}

export function ClientDistanceToNow({
  value,
  addSuffix = false,
  fallback = "",
}: ClientDistanceToNowProps) {
  const [label, setLabel] = useState(fallback)

  useEffect(() => {
    const date = toDate(value)
    setLabel(date ? formatDistanceToNow(date, { addSuffix }) : fallback)
  }, [addSuffix, fallback, value])

  return <span suppressHydrationWarning>{label}</span>
}
