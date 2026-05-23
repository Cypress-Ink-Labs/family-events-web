import { CircleCheck, CircleX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ClientDistanceToNow } from "@/components/client-date"
import type { InviteRequest } from "@/lib/types"

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
                    Submitted <ClientDistanceToNow value={request.created_at} addSuffix />
                    {request.reviewed_at && (
                      <>
                        {" · "}
                        Reviewed <ClientDistanceToNow value={request.reviewed_at} addSuffix />
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
