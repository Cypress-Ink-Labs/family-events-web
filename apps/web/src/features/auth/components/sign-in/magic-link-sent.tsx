import { Button } from "@/components/ui/button"

interface MagicLinkSentPanelProps {
  email: string
  onBack: () => void
}

export function MagicLinkSentPanel({ email, onBack }: MagicLinkSentPanelProps) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-foreground font-medium">Link sent</p>
      <p className="text-muted-foreground">
        If an account exists (or can be created) for <span className="font-medium">{email}</span>,
        the link is on its way. It expires in 1 hour.
      </p>
      <Button type="button" variant="outline" className="min-h-[44px] w-full" onClick={onBack}>
        Back to sign-in
      </Button>
    </div>
  )
}
