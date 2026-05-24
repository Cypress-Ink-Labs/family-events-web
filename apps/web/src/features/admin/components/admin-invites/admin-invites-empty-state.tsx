import { Ticket } from "lucide-react"
import { Card, CardContent } from "@/shared/components/ui/card"

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
