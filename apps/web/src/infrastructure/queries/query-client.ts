import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { emitExpiredAuthToken } from "@/infrastructure/auth/auth-events"
import { Sentry } from "@/infrastructure/observability/sentry"

// PostgREST PGRST301 = JWTExpired; GoTrue returns "invalid or expired token".
// Both mean the session is dead.
function isExpiredTokenError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const e = error as Record<string, unknown>
  const code = String(e.code ?? "")
  const msg = String(e.message ?? e.error ?? "").toLowerCase()
  return (
    code === "PGRST301" ||
    msg.includes("jwt expired") ||
    msg.includes("invalid jwt") ||
    msg.includes("invalid or expired token")
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null
}

function readText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function readStructuredError(error: unknown) {
  const record = asRecord(error)
  if (!record) {
    return null
  }

  const message =
    readText(record.message) ??
    readText(record.error_description) ??
    readText(record.details) ??
    readText(record.error)
  const code = readText(record.code) ?? readText(record.error_code)
  const status = readText(record.status) ?? readText(record.statusCode)

  return message || code || status ? { message, code, status } : null
}

function structuredErrorMessage(error: unknown): string | null {
  const details = readStructuredError(error)
  if (!details) {
    return null
  }

  const parts: string[] = []
  if (details.message) parts.push(details.message)
  if (details.code) parts.push(`code=${details.code}`)
  if (details.status) parts.push(`status=${details.status}`)
  return parts.join(" · ")
}

export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    const message = structuredErrorMessage(error)
    if (message && message !== error.message) {
      const normalized = new Error(message)
      normalized.name = error.name
      return normalized
    }
    return error
  }

  if (typeof error === "string") {
    return new Error(error)
  }

  return new Error(structuredErrorMessage(error) ?? "Unknown query error")
}

function truncateKey(key: readonly unknown[], maxLength = 200): string {
  const stringified = JSON.stringify(key)
  if (stringified.length <= maxLength) {
    return stringified
  }
  return stringified.slice(0, maxLength) + "..."
}

const queryCache = new QueryCache({
  onError(error, query) {
    if (isExpiredTokenError(error)) {
      emitExpiredAuthToken(error)
      return
    }
    Sentry.withScope((scope) => {
      scope.setTag("react_query.type", "query")
      scope.setTag("react_query.key", truncateKey(query.queryKey))
      scope.setContext("react_query", { queryHash: query.queryHash })
      const details = readStructuredError(error)
      if (details) {
        scope.setContext("react_query_error", details)
      }
      Sentry.captureException(normalizeError(error))
    })
  },
})

const mutationCache = new MutationCache({
  onError(error, _variables, _context, mutation) {
    if (isExpiredTokenError(error)) {
      emitExpiredAuthToken(error)
      return
    }
    Sentry.withScope((scope) => {
      scope.setTag("react_query.type", "mutation")
      scope.setTag("react_query.key", truncateKey(mutation.options.mutationKey ?? []))
      const details = readStructuredError(error)
      if (details) {
        scope.setContext("react_query_error", details)
      }
      Sentry.captureException(normalizeError(error))
    })
  },
})

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
