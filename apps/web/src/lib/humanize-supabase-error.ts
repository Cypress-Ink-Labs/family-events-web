import { Sentry } from "@/lib/sentry"

interface ErrorDetails {
  message: string | null
  code: string | null
  status: number | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    const record = asRecord(error)
    return {
      message: readString(error.message),
      code: readString(record?.code),
      status: readNumber(record?.status),
    }
  }

  const record = asRecord(error)
  return {
    message:
      readString(record?.message) ??
      readString(record?.error_description) ??
      readString(record?.details) ??
      null,
    code: readString(record?.code) ?? readString(record?.error_code),
    status: readNumber(record?.status),
  }
}

function isTechnicalMessage(message: string) {
  const normalized = message.toLowerCase()
  return [
    "violates",
    "constraint",
    "row-level security",
    "permission denied",
    "invalid jwt",
    "jwt",
    "foreign key",
    "null value",
    "duplicate key",
    "invalid input syntax",
    "failed to fetch",
    "failed to create source run record",
    "json object requested",
    "invalid or expired token",
    "worker failed to boot",
    "boot_error",
  ].some((snippet) => normalized.includes(snippet))
}

function toError(error: unknown, details: ErrorDetails): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === "string") {
    return new Error(error)
  }

  return new Error(details.message ?? "Unknown Supabase error")
}

export function getAdminErrorDetail(error: unknown): string | null {
  const { message, code, status } = getErrorDetails(error)
  const parts: string[] = []
  if (code) parts.push(code)
  if (status != null) parts.push(`HTTP ${status}`)
  if (message) parts.push(message)
  return parts.length > 0 ? parts.join(" · ") : null
}

export function humanizeSupabaseError(error: unknown, fallback: string): string {
  const { message, code, status } = getErrorDetails(error)
  const sentryError = toError(error, { message, code, status })

  Sentry.withScope((scope) => {
    scope.setTag("app.error_kind", "supabase")
    if (code) {
      scope.setTag("supabase.code", code)
    }
    if (status !== null) {
      scope.setTag("supabase.status", String(status))
    }
    scope.setContext("supabase_error", {
      code,
      status,
      message,
      fallback,
    })
    Sentry.captureException(sentryError)
  })

  const normalizedMessage = message?.toLowerCase() ?? ""
  const normalizedCode = code?.toLowerCase() ?? ""

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("networkerror when attempting to fetch resource")
  ) {
    return "Unable to reach the server. Check your connection and try again."
  }

  if (
    normalizedCode === "invalid_credentials" ||
    normalizedMessage.includes("invalid login credentials")
  ) {
    return "Email or password is incorrect."
  }

  if (
    normalizedCode === "email_not_confirmed" ||
    normalizedMessage.includes("email not confirmed")
  ) {
    return "Check your email and confirm your account before signing in."
  }

  if (
    code === "42501" ||
    status === 403 ||
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied")
  ) {
    return "You do not have permission to do that."
  }

  if (code === "23505" || normalizedMessage.includes("duplicate key")) {
    return "That already exists."
  }

  if (code === "23503" || normalizedMessage.includes("foreign key")) {
    return "That change references related data that could not be found."
  }

  if (code === "23502" || normalizedMessage.includes("null value")) {
    return "A required field is missing."
  }

  if (normalizedCode === "22p02" || normalizedMessage.includes("invalid input syntax")) {
    return "One of the values is invalid."
  }

  if (
    status === 401 ||
    normalizedMessage.includes("invalid jwt") ||
    normalizedMessage.includes("invalid or expired token") ||
    normalizedMessage.includes("jwt expired")
  ) {
    return "Your session is no longer valid. Sign in again and retry."
  }

  if (
    normalizedMessage.includes("worker failed to boot") ||
    normalizedMessage.includes("boot_error")
  ) {
    return "The scrape service failed to start. Try again in a moment."
  }

  if (!message) {
    return fallback
  }

  return isTechnicalMessage(message) ? fallback : message
}
