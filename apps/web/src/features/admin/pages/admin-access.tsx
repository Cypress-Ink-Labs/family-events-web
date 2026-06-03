import { useMemo, useState } from "react"
import {
  AdminAccessDeleteDialog,
  AdminAccessDisableDialog,
  AdminAccessHeader,
  AdminAccessList,
} from "@/features/admin/components/admin-access-sections"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useAdminStore } from "@/features/admin/stores/admin-store"
import {
  useAdminUserAccess,
  useDeleteAdminUser,
  useUpdateAdminUserAccess,
} from "@/features/admin/hooks/use-admin-access"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"

export function AdminAccessPage() {
  const { user, refreshProfile } = useAuth()
  const { data: accounts = [] } = useAdminUserAccess()
  const updateAccess = useUpdateAdminUserAccess()
  const deleteUser = useDeleteAdminUser()
  const { toastError } = useAdminToast()

  const query = useAdminStore((s) => s.accessQuery)
  const setQuery = useAdminStore((s) => s.setAccessQuery)
  const [dialogUserId, setDialogUserId] = useState<string | null>(null)
  const [disabledReason, setDisabledReason] = useState("")
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  const filteredAccounts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return accounts
    }

    return accounts.filter((account) => {
      const haystack = [
        account.user_profiles?.display_name ?? "",
        account.user_profiles?.email ?? "",
        account.user_profiles?.role ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(normalized)
    })
  }, [accounts, query])

  async function applyAccessChange(userId: string, isEnabled: boolean, reason?: string) {
    try {
      await updateAccess.mutateAsync({
        userId,
        isEnabled,
        disabledReason: reason ?? null,
      })
      toast.success(isEnabled ? "Account re-enabled" : "Account disabled")
      if (userId === user?.id) {
        await refreshProfile().catch(() => {})
      }
    } catch (error) {
      toastError(error, "Failed to update account access")
    }
  }

  async function handleDisableConfirm() {
    if (!dialogUserId) {
      return
    }

    await applyAccessChange(dialogUserId, false, disabledReason)
    setDialogUserId(null)
    setDisabledReason("")
  }

  async function handleDeleteConfirm() {
    if (!deleteUserId) {
      return
    }

    try {
      await deleteUser.mutateAsync(deleteUserId)
      toast.success("Account deleted")
    } catch (error) {
      toastError(error, "Failed to delete account")
    }
    setDeleteUserId(null)
  }

  return (
    <div className="space-y-6">
      <AdminAccessHeader query={query} onQueryChange={setQuery} />
      <AdminAccessList
        accounts={filteredAccounts}
        onDisable={setDialogUserId}
        onEnable={(userId) => applyAccessChange(userId, true)}
        onDelete={setDeleteUserId}
      />
      <AdminAccessDisableDialog
        open={dialogUserId !== null}
        disabledReason={disabledReason}
        isPending={updateAccess.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setDialogUserId(null)
          }
        }}
        onDisabledReasonChange={setDisabledReason}
        onConfirm={handleDisableConfirm}
      />
      <AdminAccessDeleteDialog
        open={deleteUserId !== null}
        isPending={deleteUser.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteUserId(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
