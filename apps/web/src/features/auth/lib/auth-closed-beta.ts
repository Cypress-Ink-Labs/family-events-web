import { toast } from "sonner"
import { humanizeSupabaseError } from "@/lib/supabase/errors"
import { redeemInvite } from "@/features/auth/hooks/use-invites"

type ProviderInviteMode = "sign-in" | "sign-up"

export function getProviderInviteBlockMessage(mode: ProviderInviteMode): string {
  return mode === "sign-in"
    ? "Closed beta — sign in with email after redeeming an invite code."
    : "Closed beta — request an invite code, then sign up with email or use a provider on the sign-in page."
}

export async function redeemInviteOrToast(
  code: string,
  email: string,
  setLoading: (loading: boolean) => void
): Promise<boolean> {
  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) {
    toast.error("An invite code is required right now.")
    setLoading(false)
    return false
  }

  let ok = false
  try {
    ok = await redeemInvite(normalizedCode, email)
  } catch (err) {
    toast.error("Couldn't verify invite code", {
      description: humanizeSupabaseError(err, "Try again."),
    })
    setLoading(false)
    return false
  }

  if (!ok) {
    toast.error("Invalid or expired invite code")
    setLoading(false)
    return false
  }

  return true
}
