import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEventPrice(price: number | null, isFree: boolean): string {
  if (isFree) return "Free"
  if (price == null) return "See details"
  return `$${price}`
}

const SLUG_LABEL_INITIALISMS: Record<string, string> = {
  ai: "AI",
  api: "API",
  http: "HTTP",
  jwt: "JWT",
  llm: "LLM",
  url: "URL",
}

export function formatSlugLabel(value: string | null | undefined, fallback = "—"): string {
  const normalized = value?.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
  if (!normalized) return fallback

  return normalized
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase()
      return SLUG_LABEL_INITIALISMS[lower] ?? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
    })
    .join(" ")
}

// Strip chars that have meaning in PostgREST .or() filters or SQL LIKE patterns.
// Keeps queries safe when values are interpolated into .or("col.ilike.%...%").
const POSTGREST_RESERVED = /[,.():*%_"'\\]/g

export function sanitizePostgrestLike(value: string): string {
  return value.replace(POSTGREST_RESERVED, " ").replace(/\s+/g, " ").trim()
}
