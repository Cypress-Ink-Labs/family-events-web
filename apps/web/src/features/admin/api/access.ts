import { supabase } from "@/infrastructure/supabase/client"
import type { AdminUserAccessRecord } from "@/features/admin/types"

const ADMIN_USER_ACCESS_COLUMNS =
  "user_id, is_enabled, enabled_at, disabled_at, disabled_reason, created_at, updated_at, user_profiles(display_name, email, role, created_at)"

export async function listAdminUserAccess(): Promise<AdminUserAccessRecord[]> {
  const { data, error } = await supabase
    .from("user_access")
    .select(ADMIN_USER_ACCESS_COLUMNS)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as AdminUserAccessRecord[]
}

export interface SetUserAccessInput {
  userId: string
  isEnabled: boolean
  disabledReason?: string | null
}

export async function setAdminUserAccess({
  userId,
  isEnabled,
  disabledReason,
}: SetUserAccessInput): Promise<void> {
  const payload = isEnabled
    ? { p_disabled_reason: undefined }
    : { p_disabled_reason: disabledReason?.trim() || undefined }
  const { error } = await supabase.rpc("admin_set_user_access", {
    p_user_id: userId,
    p_is_enabled: isEnabled,
    ...payload,
  })
  if (error) throw error
}
