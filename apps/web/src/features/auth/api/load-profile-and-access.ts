import { supabase } from "@/lib/supabase/client"
import { Sentry } from "@/lib/platform/sentry"
import type { UserAccess, UserProfile } from "@/lib/types"

/**
 * Fetches the current user's profile + access rows in parallel.
 *
 * Captures any Supabase error to Sentry under the `auth.syncSession` area tag
 * and rethrows so callers can decide whether to fail-soft (already-loaded
 * state) or surface the error (first sync).
 *
 * PR 4 will move this under `features/auth/api/` with a Zod parse at the
 * boundary; today the cast preserves the pre-refactor behavior.
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
    return {
      profile: (profileResult.data ?? null) as UserProfile | null,
      access: (accessResult.data ?? null) as UserAccess | null,
    }
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
