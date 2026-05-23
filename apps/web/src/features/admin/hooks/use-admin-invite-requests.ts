import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  approveInviteRequest,
  type InviteRequestStatusFilter,
  listInviteRequests,
  rejectInviteRequest,
} from "@/features/admin/api/invite-requests"

// List requests. Defaults to pending only since that's the actionable queue;
// passing 'all' returns the full audit trail.
export function useAdminInviteRequests(status: InviteRequestStatusFilter = "pending") {
  return useQuery({
    queryKey: qk.admin.inviteRequests(status),
    queryFn: () => listInviteRequests(status),
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
    mutationFn: (requestId: string) => approveInviteRequest(requestId),
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
    mutationFn: (payload: { requestId: string; notes: string | null }) =>
      rejectInviteRequest(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteRequests() })
      void queryClient.invalidateQueries({ queryKey: qk.admin.inviteRequests("all") })
    },
  })
}
