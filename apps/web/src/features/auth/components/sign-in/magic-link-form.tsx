import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { InviteCodeField } from "@/features/auth/components/sign-in/invite-code-field"

interface MagicLinkFormProps {
  email: string
  inviteCode: string
  loading: boolean
  inviteCheckLoading: boolean
  requiresInvite: boolean
  onEmailChange: (value: string) => void
  onInviteCodeChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  onSwitchToPassword: () => void
}

export function MagicLinkForm({
  email,
  inviteCode,
  loading,
  inviteCheckLoading,
  requiresInvite,
  onEmailChange,
  onInviteCodeChange,
  onSubmit,
  onSwitchToPassword,
}: MagicLinkFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      {requiresInvite && <InviteCodeField value={inviteCode} onChange={onInviteCodeChange} />}
      <Button
        type="submit"
        className="min-h-[44px] w-full"
        disabled={loading || inviteCheckLoading}
      >
        {loading ? "Sending..." : "Send magic link"}
      </Button>
      <Button
        variant="link"
        className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
        onClick={onSwitchToPassword}
      >
        Use password instead
      </Button>
    </form>
  )
}
