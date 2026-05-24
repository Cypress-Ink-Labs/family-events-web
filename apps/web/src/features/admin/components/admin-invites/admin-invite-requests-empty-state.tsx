import { Inbox } from "lucide-react"
import { Card, CardContent } from "@/shared/components/ui/card"

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
