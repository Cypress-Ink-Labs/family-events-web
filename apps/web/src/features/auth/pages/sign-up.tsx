import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Ticket } from "lucide-react"
import { useAuth } from "@/features/auth/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { HOME_PATH } from "@/lib/access-control"
import { humanizeSupabaseError } from "@/lib/humanize-supabase-error"
import {
  redeemInvite,
  resolveInviteRequirement,
  useInvitesRequired,
} from "@/features/auth/hooks/use-invites"
import { RequestInviteDialog } from "@/features/auth/components/request-invite-dialog"
import { toast } from "sonner"

export function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const {
    data: inviteRequired,
    isLoading: inviteCheckLoading,
    isError: inviteCheckFailed,
  } = useInvitesRequired()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const requiresInvite = resolveInviteRequirement(inviteRequired, inviteCheckFailed)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    // Atomic consume of the code BEFORE creating the user. If signup fails after,
    // the code is wasted; for a beta that's acceptable and simpler than compensation.
    if (requiresInvite) {
      const code = inviteCode.trim().toUpperCase()
      if (!code) {
        toast.error("An invite code is required to sign up right now.")
        setLoading(false)
        return
      }
      let ok = false
      try {
        ok = await redeemInvite(code, email)
      } catch (err) {
        toast.error("Couldn't verify invite code", {
          description: humanizeSupabaseError(err, "Try again."),
        })
        setLoading(false)
        return
      }
      if (!ok) {
        toast.error("Invalid or expired invite code")
        setLoading(false)
        return
      }
    }

    const { error } = await signUp(email, password, name)
    setLoading(false)
    if (error) {
      toast.error("Sign up failed", {
        description: humanizeSupabaseError(error, "Please try again."),
      })
    } else {
      toast.success("Account created!", { description: "Welcome to Family Events!" })
      navigate(HOME_PATH)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-lg font-black">F</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {requiresInvite
              ? "Closed beta — enter your invite code to get in"
              : "Discover the best family events near you"}
          </p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {requiresInvite && (
                <div className="space-y-1.5">
                  <Label htmlFor="invite-code" className="flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 text-primary" />
                    Invite code
                  </Label>
                  <Input
                    id="invite-code"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ABCD2345"
                    className="font-mono tracking-widest uppercase"
                    autoComplete="off"
                    required
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || inviteCheckLoading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link to="/sign-in" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
        {requiresInvite && (
          <div className="text-center mt-2">
            <RequestInviteDialog defaultEmail={email} />
          </div>
        )}
      </div>
    </div>
  )
}
