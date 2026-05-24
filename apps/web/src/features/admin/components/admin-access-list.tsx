import { ShieldCheck, ShieldOff, UserRound } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ClientDate } from "@/shared/components/client-date"
import type { AdminUserAccessRecord } from "@/features/admin/types"

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
                    <span>
                      Joined <ClientDate value={account.created_at} pattern="MMM d, yyyy" />
                    </span>
                    {account.disabled_at && (
                      <span>
                        Disabled <ClientDate value={account.disabled_at} pattern="MMM d, yyyy" />
                      </span>
                    )}
                  </div>
                  {account.disabled_reason && (
                    <p className="text-xs text-muted-foreground italic">
                      Reason: {account.disabled_reason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {account.is_enabled ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="min-h-[44px] gap-2"
                    onClick={() => onDisable(account.user_id)}
                  >
                    <ShieldOff className="size-4" />
                    <span>Disable</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] gap-2"
                    onClick={() => onEnable(account.user_id)}
                  >
                    <ShieldCheck className="size-4" />
                    <span>Re-enable</span>
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
