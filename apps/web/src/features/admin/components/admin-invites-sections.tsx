import { format, formatDistanceToNow } from "date-fns"
import {
  AlertCircle,
  Check,
  CircleCheck,
  CircleX,
  Copy,
  Inbox,
  KeyRound,
  Plus,
  Ticket,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormGrid, Toolbar } from "@/components/v2"
import type { CreatedInviteCode, InviteCode, InviteRequest } from "@/lib/types"

type ExpiryOption = "7d" | "30d" | "never"

interface AdminInvitesHeaderProps {
  codes: InviteCode[]
  dialogOpen: boolean
  newCode: {
    max_uses: number
    expires: ExpiryOption
    notes: string
  }
  isCreating: boolean
  onDialogOpenChange: (open: boolean) => void
  onMaxUsesChange: (value: string) => void
  onExpiryChange: (value: ExpiryOption) => void
  onNotesChange: (value: string) => void
  onCreate: () => void
}

export function AdminInvitesHeader({
  codes,
  dialogOpen,
  newCode,
  isCreating,
  onDialogOpenChange,
  onMaxUsesChange,
  onExpiryChange,
  onNotesChange,
  onCreate,
}: AdminInvitesHeaderProps) {
  const totalUses = codes.reduce((sum, code) => sum + code.used_count, 0)
  return (
    <Toolbar
      title="Invite Codes"
      subtitle={`${codes.length} code${codes.length === 1 ? "" : "s"} · ${totalUses} total uses`}
      actions={
        <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px] gap-2">
              <Plus className="size-4" /> New Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate invite code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-100">
                <div className="flex gap-2">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <div>
                    Codes are generated server-side and shown <strong>once</strong>. The plaintext
                    is hashed before storage; there is no way to recover it afterward, so copy it
                    immediately.
                  </div>
                </div>
              </div>
              <FormGrid cols={2} gap="3">
                <div className="space-y-1.5">
                  <Label>Max uses</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newCode.max_uses}
                    onChange={(event) => onMaxUsesChange(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expires in</Label>
                  <Select
                    value={newCode.expires}
                    onValueChange={(value) => onExpiryChange(value as ExpiryOption)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FormGrid>
              <div className="space-y-1.5">
                <Label>Notes (who's this for?)</Label>
                <Input
                  value={newCode.notes}
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="e.g. Friends & family batch"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  )
}

interface AdminInvitesCreatedRevealProps {
  created: CreatedInviteCode
  copied: boolean
  onCopy: () => void
  onDismiss: () => void
}

export function AdminInvitesCreatedReveal({
  created,
  copied,
  onCopy,
  onDismiss,
}: AdminInvitesCreatedRevealProps) {
  return (
    <Card className="border-emerald-500/40 bg-emerald-500/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <KeyRound className="size-4" />
          <span className="text-sm font-bold">Code generated, copy it now</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-base font-bold tracking-widest">
            {created.code}
          </code>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onCopy}>
              {copied ? (
                <>
                  <Check className="mr-1.5 size-3.5 text-green-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 size-3.5" /> Copy
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          This plaintext is not stored. Once dismissed, only the hash remains.
        </p>
      </CardContent>
    </Card>
  )
}

export function AdminInvitesEmptyState() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-8 text-center space-y-3">
        <Ticket className="size-8 mx-auto text-muted-foreground" />
        <h2 className="text-lg font-semibold">No invite codes yet</h2>
        <p className="text-sm text-muted-foreground">
          Generate codes to let specific people sign up during the closed beta.
        </p>
      </CardContent>
    </Card>
  )
}

interface AdminInvitesListProps {
  codes: InviteCode[]
  onDelete: (id: string) => void
}

export function AdminInvitesList({ codes, onDelete }: AdminInvitesListProps) {
  return (
    <div className="space-y-2">
      {codes.map((code) => {
        const expired = code.expires_at ? new Date(code.expires_at) < new Date() : false
        const exhausted = code.used_count >= code.max_uses
        const dead = expired || exhausted

        return (
          <Card key={code.id} className={dead ? "border-border/40 opacity-60" : "border-border/60"}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono text-xs text-muted-foreground">
                    {code.id.slice(0, 8)}…
                  </code>
                  <Badge variant="outline" className="text-[10px]">
                    {code.used_count}/{code.max_uses} used
                  </Badge>
                  {expired && (
                    <Badge variant="destructive" className="text-[10px]">
                      Expired
                    </Badge>
                  )}
                  {exhausted && !expired && (
                    <Badge variant="secondary" className="text-[10px]">
                      Exhausted
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>Created {format(new Date(code.created_at), "MMM d, h:mm a")}</span>
                  {code.expires_at && (
                    <span>Expires {format(new Date(code.expires_at), "MMM d")}</span>
                  )}
                  {code.notes && <span className="italic">{code.notes}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 text-destructive hover:text-destructive"
                  onClick={() => onDelete(code.id)}
                  aria-label="Delete invite code"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function AdminInviteRequestsEmptyState() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-8 text-center space-y-3">
        <Inbox className="size-8 mx-auto text-muted-foreground" />
        <h2 className="text-lg font-semibold">No invite requests yet</h2>
        <p className="text-sm text-muted-foreground">
          When someone clicks &quot;Request invite code&quot; on the sign-in page, they&apos;ll show
          up here for approval.
        </p>
      </CardContent>
    </Card>
  )
}

interface AdminInviteRequestsListProps {
  requests: InviteRequest[]
  approvingId: string | null
  rejectingId: string | null
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function AdminInviteRequestsList({
  requests,
  approvingId,
  rejectingId,
  onApprove,
  onReject,
}: AdminInviteRequestsListProps) {
  return (
    <div className="space-y-2">
      {requests.map((request) => {
        const isApproved = request.status === "approved"
        const isRejected = request.status === "rejected"
        const isPending = request.status === "pending"
        const isApproving = approvingId === request.id
        const isRejecting = rejectingId === request.id

        return (
          <Card
            key={request.id}
            className={
              isApproved
                ? "border-emerald-500/40"
                : isRejected
                  ? "border-border/40 opacity-60"
                  : "border-border/60"
            }
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-foreground break-all">
                      {request.email}
                    </span>
                    {isApproved && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-emerald-500/40 text-emerald-600"
                      >
                        Approved
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="secondary" className="text-[10px]">
                        Rejected
                      </Badge>
                    )}
                    {isPending && (
                      <Badge variant="outline" className="text-[10px]">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Submitted{" "}
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    {request.reviewed_at && (
                      <>
                        {" · "}
                        Reviewed{" "}
                        {formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}
                      </>
                    )}
                  </div>
                </div>
                {isPending && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => onApprove(request.id)}
                      disabled={isApproving || isRejecting}
                    >
                      <CircleCheck className="size-3.5" />
                      {isApproving ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => onReject(request.id)}
                      disabled={isApproving || isRejecting}
                    >
                      <CircleX className="size-3.5" />
                      {isRejecting ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                )}
              </div>
              {request.message && (
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-md px-3 py-2 italic">
                  &ldquo;{request.message}&rdquo;
                </p>
              )}
              {request.admin_notes && (
                <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">
                  Admin note: {request.admin_notes}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function AdminInvitesFooter() {
  return (
    <div className="text-xs text-muted-foreground border-t border-border/40 pt-4 space-y-1">
      <p className="font-semibold">Gate status</p>
      <p>
        The signup gate is controlled by the{" "}
        <code className="font-mono text-[11px]">app.settings.require_invite</code> database setting.
        When <code className="font-mono text-[11px]">true</code>, sign-up requires a code. Unset now
        defaults to <code className="font-mono text-[11px]">true</code>. Local override lives in{" "}
        <code className="font-mono text-[11px]">scripts/setup-local.sh</code>.
      </p>
    </div>
  )
}
