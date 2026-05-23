import { Ticket } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InviteCodeFieldProps {
  value: string
  onChange: (next: string) => void
}

/** Closed-beta invite code field shared by sign-in and sign-up. */
export function InviteCodeField({ value, onChange }: InviteCodeFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="invite-code" className="flex items-center gap-1.5">
        <Ticket className="size-3.5 text-primary" />
        Invite code
      </Label>
      <Input
        id="invite-code"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="ABCD2345"
        className="font-mono tracking-widest uppercase"
        autoComplete="off"
        required
      />
      <p className="text-xs text-muted-foreground">Required while we're in closed beta.</p>
    </div>
  )
}
