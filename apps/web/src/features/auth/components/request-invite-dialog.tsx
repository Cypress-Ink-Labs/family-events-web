import { useState } from "react"
import { CheckCircle2, MailPlus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestInvite } from "@/features/auth/hooks/use-request-invite"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"
import { toast } from "sonner"

const MESSAGE_MAX_LENGTH = 500

interface RequestInviteDialogProps {
  /** Optional preset email — populated when the user has typed one on the sign-in form. */
  defaultEmail?: string
  /** Render-prop-style trigger override. Defaults to a sized link-style Button. */
  trigger?: React.ReactNode
}

export function RequestInviteDialog({ defaultEmail = "", trigger }: RequestInviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const requestInvite = useRequestInvite()

  // Reset state whenever the dialog closes so re-opening starts fresh.
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      setEmail((current) => current || defaultEmail)
    }
    if (!nextOpen) {
      // Defer reset so the close animation completes without flicker.
      setTimeout(() => {
        setSubmitted(false)
        setMessage("")
        // Keep the email so re-opening with the same prefill stays sticky.
      }, 200)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("Please enter a valid email")
      return
    }

    try {
      const ok = await requestInvite.mutateAsync({
        email: trimmedEmail,
        message: message.trim() || null,
      })
      if (!ok) {
        // Server returned false — either malformed input or rate-limited.
        // The server does not distinguish so the message is intentionally vague.
        toast.error("Couldn't submit your request", {
          description: "If you've requested recently, please wait a few minutes and try again.",
        })
        return
      }
      setSubmitted(true)
    } catch (err) {
      toast.error("Couldn't submit your request", {
        description: humanizeSupabaseError(err, "Please try again later."),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
            <MailPlus className="size-3.5" />
            Request invite code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {submitted ? (
          <div className="space-y-3 py-4 text-center">
            <div className="mx-auto size-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="size-6 text-emerald-500" />
            </div>
            <DialogHeader className="space-y-1.5">
              <DialogTitle>Request received</DialogTitle>
              <DialogDescription>
                Thanks, we&apos;ll review and email you a code if approved. This usually takes a day
                or two.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => handleOpenChange(false)} className="mt-2">
              Got it
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Request an invite code</DialogTitle>
              <DialogDescription>
                We&apos;re in closed beta. Tell us a bit about yourself and we&apos;ll send a code
                if it&apos;s a fit.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="request-invite-email">Email</Label>
              <Input
                id="request-invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-invite-message" className="flex justify-between">
                <span>Anything we should know? (optional)</span>
                <span
                  className={
                    message.length > MESSAGE_MAX_LENGTH
                      ? "text-destructive text-xs"
                      : "text-muted-foreground text-xs"
                  }
                >
                  {message.length}/{MESSAGE_MAX_LENGTH}
                </span>
              </Label>
              <Textarea
                id="request-invite-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="e.g. We're a family of four in Lafayette; a friend told us about you."
                rows={4}
                maxLength={MESSAGE_MAX_LENGTH}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={requestInvite.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={requestInvite.isPending}>
                {requestInvite.isPending ? "Submitting..." : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
