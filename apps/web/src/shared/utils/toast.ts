import { toast } from "sonner"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"

export { toast }

/**
 * Standard error toast helper. Routes through `humanizeSupabaseError` (which
 * already captures to Sentry) so every call site gets:
 *  - a friendly title via the fallback message
 *  - Sentry context tagged with the supplied label
 *  - a humanized description (when the error has one)
 *
 * Use this in non-admin flows. Admin flows should keep using `useAdminToast`
 * so the technical detail is surfaced for ops.
 */
export function notifyError(error: unknown, fallback: string, options?: { title?: string }): void {
  const description = humanizeSupabaseError(error, fallback)
  toast.error(options?.title ?? fallback, { description })
}

export function notifySuccess(title: string, description?: string): void {
  toast.success(title, description ? { description } : undefined)
}
