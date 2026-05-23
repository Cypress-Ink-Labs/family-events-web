import { Inbox, Ticket, Trash2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ClientDate } from "@/shared/components/client-date"
import { useNowMs } from "@/shared/hooks/use-now-ms"
import type { InviteCode } from "@/shared/types"

interface AdminInvitesListProps {
  codes: InviteCode[]
  onDelete: (id: string) => void
}

export function AdminInvitesList({ codes, onDelete }: AdminInvitesListProps) {
  const nowMs = useNowMs()

  return (
    <div className="space-y-2">
      {codes.map((code) => {
        const expired =
          code.expires_at && nowMs !== null ? Date.parse(code.expires_at) < nowMs : false
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
                  <span>
                    Created <ClientDate value={code.created_at} pattern="MMM d, h:mm a" />
                  </span>
                  {code.expires_at && (
                    <span>
                      Expires <ClientDate value={code.expires_at} pattern="MMM d" />
                    </span>
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
