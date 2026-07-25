import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import {
  AdminAccessBulkBar,
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
import { deleteAdminUser } from "@/features/admin/api/access"
import { qk } from "@/infrastructure/queries/query-keys"
import { mapWithConcurrency } from "@/lib/async/map-with-concurrency"

export function AdminAccessPage() {
  const { user, refreshProfile } = useAuth()
  const { data: accounts = [] } = useAdminUserAccess()
  const updateAccess = useUpdateAdminUserAccess()
  const deleteUser = useDeleteAdminUser()
  const { toastError } = useAdminToast()
  const queryClient = useQueryClient()

  const query = useAdminStore((s) => s.accessQuery)
  const setQuery = useAdminStore((s) => s.setAccessQuery)
  const selectedIds = useAdminStore((s) => s.selectedIds)
  const toggleSelectedId = useAdminStore((s) => s.toggleSelectedId)
  const clearSelectedIds = useAdminStore((s) => s.clearSelectedIds)
  const setSelectedIds = useAdminStore((s) => s.setSelectedIds)

  function handleQueryChange(value: string) {
    setQuery(value)
    clearSelectedIds()
  }
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

  const selectedVisibleIds = useMemo(() => {
    const result = new Set<string>()
    for (const account of filteredAccounts) {
      if (selectedIds.has(account.user_id)) result.add(account.user_id)
    }
    return result
  }, [filteredAccounts, selectedIds])

  const selectedLoadedIds = useMemo(() => [...selectedVisibleIds], [selectedVisibleIds])
  const allLoadedSelected =
    filteredAccounts.length > 0 && selectedLoadedIds.length === filteredAccounts.length

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

  async function deleteSelectedAccounts() {
    const ids = selectedLoadedIds
    if (ids.length === 0) return
    if (
      !window.confirm(
        `Delete ${ids.length} account${ids.length === 1 ? "" : "s"}? This cannot be undone.`
      )
    ) {
      return
    }
    const results = await mapWithConcurrency(ids, 4, deleteAdminUser)
    void queryClient.invalidateQueries({ queryKey: qk.admin.userAccess })
    const succeeded = results.filter((r) => r.status === "fulfilled").length
    const failed = ids.length - succeeded
    if (succeeded > 0) {
      toast.success(`${succeeded} account${succeeded > 1 ? "s" : ""} deleted`)
    }
    if (failed > 0) {
      toast.error(`${failed} delete${failed > 1 ? "s" : ""} failed`)
    }
    clearSelectedIds()
  }

  function toggleSelectAll() {
    if (allLoadedSelected) {
      clearSelectedIds()
    } else {
      setSelectedIds(new Set(filteredAccounts.map((a) => a.user_id)))
    }
  }

  return (
    <div className="space-y-6">
      <AdminAccessHeader
        query={query}
        onQueryChange={handleQueryChange}
        loadedCount={filteredAccounts.length}
        allLoadedSelected={allLoadedSelected}
        onToggleSelectAll={toggleSelectAll}
      />
      <AdminAccessBulkBar
        selectedCount={selectedLoadedIds.length}
        isDeletePending={deleteUser.isPending}
        onDelete={deleteSelectedAccounts}
        onClear={clearSelectedIds}
      />
      <AdminAccessList
        accounts={filteredAccounts}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelectedId}
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
