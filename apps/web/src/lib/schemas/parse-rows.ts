import type { ZodType, output } from "zod"
import { Sentry } from "@/infrastructure/observability/sentry"

interface ParseRowsOptions {
  /** Sentry `area` tag to scope captured errors. */
  area: string
}

/**
 * Parse each entry in `rows` through `schema`, dropping individual failures.
 * Failures are surfaced to Sentry tagged with the supplied `area`, scoped
 * with the offending row's `id` if present.
 *
 * Use at Supabase RPC / select boundaries where:
 *  - the consumer expects a typed array,
 *  - a malformed individual row shouldn't blank the whole list,
 *  - drift should still be observable, not silently swallowed.
 */
export function parseRowsWithSentry<S extends ZodType<unknown, unknown>>(
  schema: S,
  rows: unknown,
  { area }: ParseRowsOptions
): output<S>[] {
  if (!Array.isArray(rows)) {
    if (rows != null) {
      Sentry.captureException(
        new Error(`parseRowsWithSentry: expected array, got ${typeof rows}`),
        {
          tags: { area },
        }
      )
    }
    return []
  }

  const out: output<S>[] = []
  for (const row of rows) {
    const result = schema.safeParse(row)
    if (result.success) {
      out.push(result.data as output<S>)
    } else {
      Sentry.captureException(result.error, {
        tags: { area },
        extra: { row_id: (row as { id?: unknown })?.id ?? null },
      })
    }
  }
  return out
}
