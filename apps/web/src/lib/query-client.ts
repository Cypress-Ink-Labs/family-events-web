import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { Sentry } from "@/lib/sentry"

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

// Auth-error policy lives in auth-store. query-client just reports.
// Registered late to avoid a circular import (auth-store imports queryClient).
let authErrorHandler: ((error: unknown) => void) | null = null

export function registerAuthErrorHandler(handler: (error: unknown) => void): () => void {
  authErrorHandler = handler
  return () => {
    if (authErrorHandler === handler) authErrorHandler = null
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === "string") {
    return new Error(error)
  }

  return new Error("Unknown query error")
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
      authErrorHandler?.(error)
      return
    }
    Sentry.withScope((scope) => {
      scope.setTag("react_query.type", "query")
      scope.setTag("react_query.key", truncateKey(query.queryKey))
      scope.setContext("react_query", { queryHash: query.queryHash })
      Sentry.captureException(normalizeError(error))
    })
  },
})

const mutationCache = new MutationCache({
  onError(error, _variables, _context, mutation) {
    if (isExpiredTokenError(error)) {
      authErrorHandler?.(error)
      return
    }
    Sentry.withScope((scope) => {
      scope.setTag("react_query.type", "mutation")
      scope.setTag("react_query.key", truncateKey(mutation.options.mutationKey ?? []))
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
