import { useMutation, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"

// Anon-callable: submits an invite request. Rate-limited server-side
// (3 attempts per 10 min per email_hash). Idempotent on the same email
// while a pending row exists.
export function useRequestInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { email: string; message: string | null }): Promise<boolean> => {
      const { data, error } = await supabase.rpc("request_invite", {
        p_email: payload.email,
        p_message: payload.message ?? undefined,
      })
      if (error) throw error
      return Boolean(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteRequests("pending") })
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteRequests("all") })
    },
  })
}
