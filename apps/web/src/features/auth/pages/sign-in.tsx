import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
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

// Only treat string `from` values that look like in-app paths. Anything else
// (full URL, javascript:, missing leading /) falls back to HOME_PATH — this
// keeps a malicious referer or stale state from triggering an open redirect.
function resolveRedirectTarget(rawFrom: unknown): string {
  if (typeof rawFrom !== "string") return HOME_PATH
  if (!rawFrom.startsWith("/") || rawFrom.startsWith("//")) return HOME_PATH
  return rawFrom
}

type Mode = "password" | "magic" | "magic-sent"

export function SignInPage() {
  const { signIn, sendMagicLink } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = resolveRedirectTarget((location.state as { from?: unknown } | null)?.from)
  const {
    data: inviteRequired,
    isLoading: inviteCheckLoading,
    isError: inviteCheckFailed,
  } = useInvitesRequired()
  const requiresInvite = resolveInviteRequirement(inviteRequired, inviteCheckFailed)

  const [mode, setMode] = useState<Mode>("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error("Sign in failed", {
        description: humanizeSupabaseError(error, "Please try again."),
      })
    } else {
      toast.success("Welcome back!")
      navigate(redirectTo, { replace: true })
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Atomic invite consume happens BEFORE Supabase Auth dispatches the email
    // — mirrors the sign-up policy. shouldCreateUser is always true on this
    // path because the email might be a brand-new account; an existing user
    // is unaffected (the call is idempotent for known emails).
    if (requiresInvite) {
      const code = inviteCode.trim().toUpperCase()
      if (!code) {
        toast.error("An invite code is required to request a magic link right now.")
        return
      }
      setLoading(true)
      let ok = false
      try {
        ok = await redeemInvite(code, email)
      } catch (err) {
        setLoading(false)
        toast.error("Couldn't verify invite code", {
          description: humanizeSupabaseError(err, "Try again."),
        })
        return
      }
      if (!ok) {
        setLoading(false)
        toast.error("Invalid or expired invite code")
        return
      }
    } else {
      setLoading(true)
    }

    const { error } = await sendMagicLink(email, true)
    setLoading(false)
    if (error) {
      toast.error("Couldn't send link", {
        description: humanizeSupabaseError(error, "Try again in a minute."),
      })
      return
    }
    setMode("magic-sent")
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
          <h1 className="text-2xl font-extrabold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "magic"
              ? "We'll email you a one-tap sign-in link."
              : mode === "magic-sent"
                ? "Check your inbox."
                : "Sign in to discover family events"}
          </p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-6">
            {mode === "magic-sent" ? (
              <div className="space-y-3 text-sm">
                <p className="text-foreground font-medium">Link sent</p>
                <p className="text-muted-foreground">
                  If an account exists (or can be created) for{" "}
                  <span className="font-medium">{email}</span>, the link is on its way. It expires
                  in 1 hour.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode("password")
                    setInviteCode("")
                  }}
                >
                  Back to sign-in
                </Button>
              </div>
            ) : mode === "magic" ? (
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
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
                    <p className="text-xs text-muted-foreground">
                      Required while we're in closed beta.
                    </p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading || inviteCheckLoading}>
                  {loading ? "Sending..." : "Send magic link"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Use password instead
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  Email me a link instead
                </button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{" "}
          <Link to="/sign-up" className="text-primary font-medium hover:underline">
            Use invite
          </Link>
        </p>
        <div className="text-center mt-2">
          <RequestInviteDialog defaultEmail={email} />
        </div>
      </div>
    </div>
  )
}
