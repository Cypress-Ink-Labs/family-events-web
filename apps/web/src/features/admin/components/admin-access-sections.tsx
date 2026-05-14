import { format } from "date-fns"
import { Search, ShieldCheck, ShieldOff, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AdminUserAccessRecord } from "@/features/admin/hooks/admin-types"

interface AdminAccessHeaderProps {
  query: string
  onQueryChange: (value: string) => void
}

export function AdminAccessHeader({ query, onQueryChange }: AdminAccessHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Account Access</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enable or disable invited accounts without deleting them.
        </p>
      </div>
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or email"
          className="pl-9"
        />
      </div>
    </div>
  )
}

interface AdminAccessListProps {
  accounts: AdminUserAccessRecord[]
  currentUserId?: string
  onDisable: (userId: string) => void
  onEnable: (userId: string) => void
}

export function AdminAccessList({
  accounts,
  currentUserId,
  onDisable,
  onEnable,
}: AdminAccessListProps) {
  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const profile = account.user_profiles
        const isSelf = account.user_id === currentUserId

        return (
          <Card key={account.user_id} className="border-border/60">
            <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {profile?.display_name || profile?.email || account.user_id}
                    </p>
                    <Badge variant={account.is_enabled ? "secondary" : "destructive"}>
                      {account.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {profile?.role === "admin" && <Badge variant="outline">Admin</Badge>}
                    {isSelf && <Badge variant="outline">You</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile?.email || "No email on file"}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Joined {format(new Date(account.created_at), "MMM d, yyyy")}</span>
                    {account.disabled_at && (
                      <span>Disabled {format(new Date(account.disabled_at), "MMM d, yyyy")}</span>
                    )}
                  </div>
                  {account.disabled_reason && (
                    <p className="text-xs text-muted-foreground italic">
                      Reason: {account.disabled_reason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {account.is_enabled ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => onDisable(account.user_id)}
                  >
                    <ShieldOff className="size-4" />
                    Disable
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => onEnable(account.user_id)}
                  >
                    <ShieldCheck className="size-4" />
                    Re-enable
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {accounts.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No matching accounts.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface AdminAccessDisableDialogProps {
  open: boolean
  disabledReason: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onDisabledReasonChange: (value: string) => void
  onConfirm: () => void
}

export function AdminAccessDisableDialog({
  open,
  disabledReason,
  isPending,
  onOpenChange,
  onDisabledReasonChange,
  onConfirm,
}: AdminAccessDisableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable account</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="disable-reason">Reason (optional)</Label>
          <Textarea
            id="disable-reason"
            value={disabledReason}
            onChange={(event) => onDisabledReasonChange(event.target.value)}
            placeholder="Explain why this account is being disabled."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Disabling..." : "Disable account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
