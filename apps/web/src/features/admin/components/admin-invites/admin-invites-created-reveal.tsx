import { Check, Copy, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CreatedInviteCode } from "@/shared/types"

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
