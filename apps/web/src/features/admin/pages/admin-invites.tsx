import { useReducer } from "react"
import { addDays } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Badge } from "@/shared/components/ui/badge"
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
  useInvitesRequired,
} from "@/features/auth/hooks/use-invites"
import {
  useAdminApproveInviteRequest,
  useAdminInviteRequests,
  useAdminRejectInviteRequest,
} from "@/features/admin/hooks/use-admin-invite-requests"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"
import { AlertTriangle, Loader2, ShieldCheck, ShieldOff } from "lucide-react"
import type { CreatedInviteCode } from "@/shared/types"

type ExpiryOption = "7d" | "30d" | "never"
type Tab = "codes" | "requests"

interface AdminInvitesState {
  activeTab: Tab
  dialogOpen: boolean
  justCreated: CreatedInviteCode | null
  revealCopied: boolean
  newCode: {
    max_uses: number
    expires: ExpiryOption
    notes: string
  }
  approvingId: string | null
  rejectingId: string | null
}

const initialAdminInvitesState: AdminInvitesState = {
  activeTab: "codes",
  dialogOpen: false,
  justCreated: null,
  revealCopied: false,
  newCode: {
    max_uses: 1,
    expires: "30d",
    notes: "",
  },
  approvingId: null,
  rejectingId: null,
}

function adminInvitesReducer(
  state: AdminInvitesState,
  patch: Partial<AdminInvitesState>
): AdminInvitesState {
  return { ...state, ...patch }
}

export function AdminInvitesPage() {
  const { data: codes = [] } = useAdminInviteCodes()
  const createCode = useCreateInviteCode()
  const deleteCode = useDeleteInviteCode()
  const { toastError } = useAdminToast()
  const { data: inviteRequired, isLoading: gateLoading, isError: gateError } = useInvitesRequired()

  // Requests tab: only PENDING by default — that's the actionable queue.
  // We separately fetch the reviewed history when the admin scrolls.
  const { data: pendingRequests = [] } = useAdminInviteRequests("pending")
  const { data: reviewedRequests = [] } = useAdminInviteRequests("all")
  const approveRequest = useAdminApproveInviteRequest()
  const rejectRequest = useAdminRejectInviteRequest()

  const [state, setState] = useReducer(adminInvitesReducer, initialAdminInvitesState)
  const { activeTab, dialogOpen, justCreated, revealCopied, newCode, approvingId, rejectingId } =
    state

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
      setState({
        dialogOpen: false,
        newCode: initialAdminInvitesState.newCode,
        justCreated: created,
        revealCopied: false,
      })
      await navigator.clipboard.writeText(created.code).catch(() => {})
      setState({ revealCopied: true })
      toast.success("Code generated and copied to clipboard")
    } catch (err) {
      toastError(err, "Failed to create code")
    }
  }

  async function handleCopyReveal() {
    if (!justCreated) return
    try {
      await navigator.clipboard.writeText(justCreated.code)
      setState({ revealCopied: true })
      setTimeout(() => setState({ revealCopied: false }), 1500)
    } catch {
      toast.error("Clipboard unavailable")
    }
  }

  function handleDismissReveal() {
    setState({ justCreated: null, revealCopied: false })
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
    setState({ approvingId: requestId })
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
      setState({ justCreated: created, revealCopied: false })
      await navigator.clipboard.writeText(approved.code).catch(() => {})
      setState({ revealCopied: true })
      // Surface the code on the Codes tab so the admin can see it in context.
      setState({ activeTab: "codes" })
      toast.success(`Approved ${approved.email} — code copied to clipboard`)
    } catch (err) {
      toastError(err, "Failed to approve request")
    } finally {
      setState({ approvingId: null })
    }
  }

  async function handleReject(requestId: string) {
    setState({ rejectingId: requestId })
    try {
      const ok = await rejectRequest.mutateAsync({ requestId, notes: null })
      if (ok) toast.success("Request rejected")
      else toast.error("Couldn't reject — already reviewed?")
    } catch (err) {
      toastError(err, "Failed to reject request")
    } finally {
      setState({ rejectingId: null })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        {gateLoading ? (
          <>
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Checking gate status…</span>
          </>
        ) : gateError ? (
          <>
            <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-500" />
            <span className="text-muted-foreground">Unable to determine gate status</span>
          </>
        ) : inviteRequired ? (
          <>
            <ShieldCheck className="size-4 text-green-600 dark:text-green-500" />
            <span>Invite gate:</span>
            <Badge variant="default">Enabled</Badge>
          </>
        ) : (
          <>
            <ShieldOff className="size-4 text-muted-foreground" />
            <span>Invite gate:</span>
            <Badge variant="outline">Disabled</Badge>
          </>
        )}
      </div>

      <AdminInvitesHeader
        codes={codes}
        dialogOpen={dialogOpen}
        newCode={newCode}
        isCreating={createCode.isPending}
        onDialogOpenChange={(dialogOpen) => setState({ dialogOpen })}
        onMaxUsesChange={(value) =>
          setState({ newCode: { ...newCode, max_uses: Math.max(1, Number(value)) } })
        }
        onExpiryChange={(value) => setState({ newCode: { ...newCode, expires: value } })}
        onNotesChange={(value) => setState({ newCode: { ...newCode, notes: value } })}
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

      <Tabs value={activeTab} onValueChange={(value) => setState({ activeTab: value as Tab })}>
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
                  <h2 className="text-sm font-semibold text-foreground">Pending review</h2>
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
                  <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
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
