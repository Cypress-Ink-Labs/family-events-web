import { Sentry } from "@/lib/platform/sentry"

/**
 * Wraps an async operation in a Sentry-reporting try/catch.
 *
 * On success: returns the value unchanged.
 * On failure: captures the exception under the supplied label and rethrows
 * so callers (mutations, store methods) can react without losing the stack.
 *
 * Use this instead of hand-rolling `try { ... } catch (e) { Sentry.captureException(e); throw e }`
 * — call sites stay short and the Sentry tag is always set.
 */
export async function withSentry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("app.op", label)
      Sentry.captureException(error)
    })
    throw error
  }
}

/**
 * Variant that swallows the error after capturing — useful for fire-and-forget
 * side effects (analytics, optimistic updates) where bubbling the throw would
 * abort an outer flow that's already committed.
 */
export async function tryWithSentry<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("app.op", label)
      Sentry.captureException(error)
    })
    return null
  }
}
