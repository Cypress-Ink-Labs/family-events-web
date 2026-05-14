import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase"
import type { ApprovedInviteRequest, InviteRequest, InviteRequestStatus } from "@/lib/types"

type StatusFilter = InviteRequestStatus | "all"

// List requests. Defaults to pending only since that's the actionable queue;
// passing 'all' returns the full audit trail.
export function useAdminInviteRequests(status: StatusFilter = "pending") {
  return useQuery({
    queryKey: qk.admin.inviteRequests(status),
    queryFn: async (): Promise<InviteRequest[]> => {
      let query = supabase
        .from("invite_requests")
        .select(
          "id, email, message, status, invite_code_id, admin_notes, created_at, reviewed_at, reviewed_by"
        )
        .order("created_at", { ascending: false })
      if (status !== "all") {
        query = query.eq("status", status)
      }
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as InviteRequest[]
    },
    // Refresh frequently while admin is on the page; cheap query.
    refetchInterval: 15_000,
  })
}

// One-click approve: generates a new invite code AND links it to the request
// in a single SECURITY DEFINER call. Returns the plaintext code so the UI
// surfaces it once through the same reveal panel as admin_create_invite_code.
export function useAdminApproveInviteRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string): Promise<ApprovedInviteRequest> => {
      const { data, error } = await supabase
        .rpc("admin_approve_invite_request", { p_request_id: requestId })
        .single<ApprovedInviteRequest>()
      if (error) throw error
      if (!data) throw new Error("admin_approve_invite_request returned no row")
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteRequests() })
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteRequests("all") })
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteCodes })
    },
  })
}

export function useAdminRejectInviteRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { requestId: string; notes: string | null }): Promise<boolean> => {
      const { data, error } = await supabase.rpc("admin_reject_invite_request", {
        p_request_id: payload.requestId,
        p_notes: payload.notes ?? undefined,
      })
      if (error) throw error
      return Boolean(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteRequests() })
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteRequests("all") })
    },
  })
}
