import { supabase } from "@/infrastructure/supabase/client"
import { Sentry } from "@/infrastructure/observability/sentry"
import { userAccessRowSchema, userProfileRowSchema } from "@/lib/schemas"
import type { UserAccess, UserProfile } from "@/shared/types"

/**
 * Fetches the current user's profile + access rows in parallel.
 *
 * Each row is run through its Zod schema so an unexpected payload fails
 * loudly here (with a tagged Sentry capture) instead of being cast to
 * `UserProfile | null` and producing confusing downstream errors.
 *
 * Captures any error to Sentry under the `auth.syncSession` area tag and
 * rethrows so callers can decide whether to fail-soft (already-loaded state)
 * or surface the error (first sync).
 */
export async function loadProfileAndAccess(userId: string): Promise<{
  profile: UserProfile | null
  access: UserAccess | null
}> {
  try {
    const [profileResult, accessResult] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_access").select("*").eq("user_id", userId).maybeSingle(),
    ])
    if (profileResult.error) throw profileResult.error
    if (accessResult.error) throw accessResult.error

    const profile = profileResult.data
      ? (userProfileRowSchema.parse(profileResult.data) as unknown as UserProfile)
      : null
    const access = accessResult.data
      ? (userAccessRowSchema.parse(accessResult.data) as unknown as UserAccess)
      : null

    return { profile, access }
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "auth.syncSession" } })
    throw error instanceof Error ? error : new Error("Failed to load profile")
  }
}

/**
 * Best-effort invite claim. Non-fatal: a missing or failing RPC must not
 * block sign-in. Swallows the error rather than letting it bubble.
 */
export async function claimPendingInviteAccess(): Promise<void> {
  try {
    await supabase.rpc("claim_pending_invite_access")
  } catch {
    // intentional: claim failures are non-blocking
  }
}
