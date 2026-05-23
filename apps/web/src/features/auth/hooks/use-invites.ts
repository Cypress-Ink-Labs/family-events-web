import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { supabase } from "@/infrastructure/supabase/client"
import type { CreatedInviteCode, InviteCode } from "@/shared/types"

export function resolveInviteRequirement(
  inviteRequired: boolean | undefined,
  inviteCheckFailed: boolean
): boolean {
  if (inviteCheckFailed) {
    return true
  }

  return inviteRequired ?? true
}

// Used by sign-up page: do we need to collect a code?
export function useInvitesRequired() {
  return useQuery({
    queryKey: qk.invites.required,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("invites_required")
      if (error) throw error
      return Boolean(data)
    },
    staleTime: 5 * 60 * 1000, // cache for 5 min
  })
}

// Atomic consume. Returns true on success; false if invalid/expired/exhausted/rate-limited.
export async function redeemInvite(code: string, email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("redeem_invite_for_email", {
    p_code: code,
    p_email: email,
  })
  if (error) throw error
  return Boolean(data)
}

// Admin: list all codes (metadata only — plaintext is unrecoverable post-creation).
export function useAdminInviteCodes() {
  return useQuery({
    queryKey: qk.admin.inviteCodes,
    queryFn: async (): Promise<InviteCode[]> => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("id, max_uses, used_count, expires_at, notes, created_by, created_at")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as InviteCode[]
    },
  })
}

// Admin-only: generate a new invite code via the SECURITY DEFINER RPC.
// The plaintext `code` in the response is visible ONCE — only the sha256 hash
// is persisted, so admins must surface the plaintext to the invitee immediately.
export function useCreateInviteCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      max_uses: number
      expires_at: string | null
      notes: string | null
    }): Promise<CreatedInviteCode> => {
      const { data, error } = await supabase
        .rpc("admin_create_invite_code", {
          p_max_uses: payload.max_uses,
          // The generated RPC types model "default NULL" parameters as
          // `string | undefined` rather than `string | null`. Normalize so a
          // null caller intent becomes omission on the wire.
          p_expires_at: payload.expires_at ?? undefined,
          p_notes: payload.notes ?? undefined,
        })
        .single<CreatedInviteCode>()
      if (error) throw error
      if (!data) throw new Error("admin_create_invite_code returned no row")
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteCodes })
    },
  })
}

export function useDeleteInviteCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invite_codes").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteCodes })
    },
  })
}
