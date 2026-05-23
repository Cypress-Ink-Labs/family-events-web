import { supabase } from "@/infrastructure/supabase/client"
import type { ApprovedInviteRequest, InviteRequest, InviteRequestStatus } from "@/shared/types"

const INVITE_REQUEST_COLUMNS =
  "id, email, message, status, invite_code_id, admin_notes, created_at, reviewed_at, reviewed_by"

export type InviteRequestStatusFilter = InviteRequestStatus | "all"

export async function listInviteRequests(
  status: InviteRequestStatusFilter
): Promise<InviteRequest[]> {
  let query = supabase
    .from("invite_requests")
    .select(INVITE_REQUEST_COLUMNS)
    .order("created_at", { ascending: false })
  if (status !== "all") {
    query = query.eq("status", status)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as InviteRequest[]
}

export async function approveInviteRequest(requestId: string): Promise<ApprovedInviteRequest> {
  const { data, error } = await supabase
    .rpc("admin_approve_invite_request", { p_request_id: requestId })
    .single<ApprovedInviteRequest>()
  if (error) throw error
  if (!data) throw new Error("admin_approve_invite_request returned no row")
  return data
}

export async function rejectInviteRequest(payload: {
  requestId: string
  notes: string | null
}): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_reject_invite_request", {
    p_request_id: payload.requestId,
    p_notes: payload.notes ?? undefined,
  })
  if (error) throw error
  return Boolean(data)
}
