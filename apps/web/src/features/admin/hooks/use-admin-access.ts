import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { useAuth } from "@/features/auth/stores/auth-store"
import {
  listAdminUserAccess,
  setAdminUserAccess,
  deleteAdminUser,
  type SetUserAccessInput,
} from "@/features/admin/api/access"
import {
  type AdminUserAccessRecord,
  canDeleteAccount,
  canDisableAccount,
  canEnableAccount,
  isAdminAccount,
  isSelfAccount,
} from "@/features/admin/types"

export function useAdminUserAccess() {
  return useQuery({
    queryKey: qk.admin.userAccess,
    queryFn: listAdminUserAccess,
  })
}

export function useUpdateAdminUserAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetUserAccessInput) => setAdminUserAccess(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.userAccess })
    },
  })
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.userAccess })
    },
  })
}

export function useAccountPermissions(account: AdminUserAccessRecord) {
  const { user } = useAuth()
  const currentUserId = user?.id

  return {
    isSelf: isSelfAccount(account, currentUserId),
    isAdmin: isAdminAccount(account),
    canDisable: canDisableAccount(account, currentUserId),
    canEnable: canEnableAccount(account, currentUserId),
    canDelete: canDeleteAccount(account, currentUserId),
  }
}
