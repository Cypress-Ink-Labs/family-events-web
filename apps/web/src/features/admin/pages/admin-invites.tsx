import { useState } from "react"
import { addDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  AdminInviteRequestsEmptyState,
  AdminInviteRequestsList,
  AdminInvitesCreatedReveal,
  AdminInvitesEmptyState,
  AdminInvitesFooter,
  AdminInvitesHeader,
  AdminInvitesList,
} from "@/features/admin/components/admin-invites-sections"
import {
  useAdminInviteCodes,
  useCreateInviteCode,
  useDeleteInviteCode,
} from "@/features/auth/hooks/use-invites"
import {
  useAdminApproveInviteRequest,
  useAdminInviteRequests,
  useAdminRejectInviteRequest,
} from "@/features/admin/hooks/use-admin-invite-requests"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"
import type { CreatedInviteCode } from "@/lib/types"

type ExpiryOption = "7d" | "30d" | "never"
type Tab = "codes" | "requests"

export function AdminInvitesPage() {
  const { data: codes = [] } = useAdminInviteCodes()
  const createCode = useCreateInviteCode()
  const deleteCode = useDeleteInviteCode()
  const { toastError } = useAdminToast()

  // Requests tab: only PENDING by default — that's the actionable queue.
  // We separately fetch the reviewed history when the admin scrolls.
  const { data: pendingRequests = [] } = useAdminInviteRequests("pending")
  const { data: reviewedRequests = [] } = useAdminInviteRequests("all")
  const approveRequest = useAdminApproveInviteRequest()
  const rejectRequest = useAdminRejectInviteRequest()

  const [activeTab, setActiveTab] = useState<Tab>("codes")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [justCreated, setJustCreated] = useState<CreatedInviteCode | null>(null)
  const [revealCopied, setRevealCopied] = useState(false)
  const [newCode, setNewCode] = useState({
    max_uses: 1,
    expires: "30d" as ExpiryOption,
    notes: "",
  })
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  // History minus the ones already pending — pending get their own list above.
  const reviewedOnly = reviewedRequests.filter((r) => r.status !== "pending")
  const pendingCount = pendingRequests.length

  function resolveExpiry(expires: ExpiryOption): string | null {
    if (expires === "never") return null
    const days = expires === "7d" ? 7 : 30
    return addDays(new Date(), days).toISOString()
  }

  async function handleCreate() {
    try {
      const created = await createCode.mutateAsync({
        max_uses: newCode.max_uses,
        expires_at: resolveExpiry(newCode.expires),
        notes: newCode.notes.trim() || null,
      })
      setDialogOpen(false)
      setNewCode({ max_uses: 1, expires: "30d", notes: "" })
      setJustCreated(created)
      setRevealCopied(false)
      await navigator.clipboard.writeText(created.code).catch(() => {})
      setRevealCopied(true)
      toast.success("Code generated and copied to clipboard")
    } catch (err) {
      toastError(err, "Failed to create code")
    }
  }

  async function handleCopyReveal() {
    if (!justCreated) return
    try {
      await navigator.clipboard.writeText(justCreated.code)
      setRevealCopied(true)
      setTimeout(() => setRevealCopied(false), 1500)
    } catch {
      toast.error("Clipboard unavailable")
    }
  }

  function handleDismissReveal() {
    setJustCreated(null)
    setRevealCopied(false)
  }

  async function handleDelete(id: string) {
    try {
      await deleteCode.mutateAsync(id)
      toast.success("Code deleted")
    } catch (err) {
      toastError(err, "Failed to delete")
    }
  }

  // Approve + reveal: one click → server generates code + links it to the
  // request → plaintext shown once via the same reveal panel used for
  // admin_create_invite_code. The admin copies + sends manually.
  async function handleApprove(requestId: string) {
    setApprovingId(requestId)
    try {
      const approved = await approveRequest.mutateAsync(requestId)
      const created: CreatedInviteCode = {
        id: approved.invite_code_id,
        code: approved.code,
        max_uses: 1,
        expires_at: null,
        notes: `Approved invite request: ${approved.email}`,
        created_at: approved.created_at,
      }
      setJustCreated(created)
      setRevealCopied(false)
      await navigator.clipboard.writeText(approved.code).catch(() => {})
      setRevealCopied(true)
      // Surface the code on the Codes tab so the admin can see it in context.
      setActiveTab("codes")
      toast.success(`Approved ${approved.email} — code copied to clipboard`)
    } catch (err) {
      toastError(err, "Failed to approve request")
    } finally {
      setApprovingId(null)
    }
  }

  async function handleReject(requestId: string) {
    setRejectingId(requestId)
    try {
      const ok = await rejectRequest.mutateAsync({ requestId, notes: null })
      if (ok) toast.success("Request rejected")
      else toast.error("Couldn't reject — already reviewed?")
    } catch (err) {
      toastError(err, "Failed to reject request")
    } finally {
      setRejectingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <AdminInvitesHeader
        codes={codes}
        dialogOpen={dialogOpen}
        newCode={newCode}
        isCreating={createCode.isPending}
        onDialogOpenChange={setDialogOpen}
        onMaxUsesChange={(value) =>
          setNewCode((prev) => ({ ...prev, max_uses: Math.max(1, Number(value)) }))
        }
        onExpiryChange={(value) => setNewCode((prev) => ({ ...prev, expires: value }))}
        onNotesChange={(value) => setNewCode((prev) => ({ ...prev, notes: value }))}
        onCreate={handleCreate}
      />

      {justCreated && (
        <AdminInvitesCreatedReveal
          created={justCreated}
          copied={revealCopied}
          onCopy={handleCopyReveal}
          onDismiss={handleDismissReveal}
        />
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)}>
        <TabsList>
          <TabsTrigger value="codes">Codes</TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-4 mt-4">
          {codes.length === 0 ? (
            <AdminInvitesEmptyState />
          ) : (
            <AdminInvitesList codes={codes} onDelete={handleDelete} />
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-6 mt-4">
          {pendingCount === 0 && reviewedOnly.length === 0 ? (
            <AdminInviteRequestsEmptyState />
          ) : (
            <>
              {pendingCount > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-foreground">Pending review</h2>
                  <AdminInviteRequestsList
                    requests={pendingRequests}
                    approvingId={approvingId}
                    rejectingId={rejectingId}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                </div>
              )}
              {reviewedOnly.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-muted-foreground">History</h2>
                  <AdminInviteRequestsList
                    requests={reviewedOnly}
                    approvingId={null}
                    rejectingId={null}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <AdminInvitesFooter />
    </div>
  )
}
