import { useReducer } from "react"
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

interface SignInState {
  mode: Mode
  email: string
  password: string
  inviteCode: string
  loading: boolean
}

const signInInitialState: SignInState = {
  mode: "password",
  email: "",
  password: "",
  inviteCode: "",
  loading: false,
}

function signInReducer(state: SignInState, patch: Partial<SignInState>) {
  return { ...state, ...patch }
}

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

  const [state, setState] = useReducer(signInReducer, signInInitialState)
  const { mode, email, password, inviteCode, loading } = state

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ loading: true })
    const { error } = await signIn(email, password)
    setState({ loading: false })
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
      setState({ loading: true })
      let ok = false
      try {
        ok = await redeemInvite(code, email)
      } catch (err) {
        setState({ loading: false })
        toast.error("Couldn't verify invite code", {
          description: humanizeSupabaseError(err, "Try again."),
        })
        return
      }
      if (!ok) {
        setState({ loading: false })
        toast.error("Invalid or expired invite code")
        return
      }
    } else {
      setState({ loading: true })
    }

    const { error } = await sendMagicLink(email, true)
    setState({ loading: false })
    if (error) {
      toast.error("Couldn't send link", {
        description: humanizeSupabaseError(error, "Try again in a minute."),
      })
      return
    }
    setState({ mode: "magic-sent" })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="mb-4 inline-flex min-h-[44px] min-w-[44px] items-center gap-2">
            <div
              className="flex size-10 items-center justify-center rounded-md font-display text-lg font-medium text-primary-foreground"
              style={{ background: "var(--color-accent-primary)" }}
            >
              F
            </div>
          </Link>
          <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
                  className="min-h-[44px] w-full"
                  onClick={() => {
                    setState({ mode: "password", inviteCode: "" })
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
                    onChange={(e) => setState({ email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                {requiresInvite && (
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-code" className="flex items-center gap-1.5">
                      <Ticket className="size-3.5 text-primary" />
                      Invite code
                    </Label>
                    <Input
                      id="invite-code"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setState({ inviteCode: e.target.value.toUpperCase() })}
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
                <Button
                  type="submit"
                  className="min-h-[44px] w-full"
                  disabled={loading || inviteCheckLoading}
                >
                  {loading ? "Sending..." : "Send magic link"}
                </Button>
                <button
                  type="button"
                  onClick={() => setState({ mode: "password" })}
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
                    onChange={(e) => setState({ email: e.target.value })}
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
                    onChange={(e) => setState({ password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="min-h-[44px] w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <button
                  type="button"
                  onClick={() => setState({ mode: "magic" })}
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
