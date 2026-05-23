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

// Strip chars that have meaning in PostgREST .or() filters or SQL LIKE patterns.
// Keeps queries safe when values are interpolated into .or("col.ilike.%...%").
const POSTGREST_RESERVED = /[,.():*%_"'\\]/g

export function sanitizePostgrestLike(value: string): string {
  return value.replace(POSTGREST_RESERVED, " ").replace(/\s+/g, " ").trim()
}
