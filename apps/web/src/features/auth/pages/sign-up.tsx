import { useReducer } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Ticket } from "lucide-react"
import { useAuth } from "@/features/auth/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { HOME_PATH } from "@/lib/access-control"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"
import { resolveInviteRequirement, useInvitesRequired } from "@/features/auth/hooks/use-invites"
import {
  getProviderInviteBlockMessage,
  redeemInviteOrToast,
} from "@/features/auth/lib/auth-closed-beta"
import { RequestInviteDialog } from "@/features/auth/components/request-invite-dialog"
import { AppleIcon, GoogleIcon } from "@/features/auth/components/provider-icons"
import { toast } from "sonner"

interface SignUpState {
  name: string
  email: string
  password: string
  inviteCode: string
  loading: boolean
}

const signUpInitialState: SignUpState = {
  name: "",
  email: "",
  password: "",
  inviteCode: "",
  loading: false,
}

function signUpReducer(state: SignUpState, patch: Partial<SignUpState>) {
  return { ...state, ...patch }
}

export function SignUpPage() {
  const { signUp, signInWithProvider } = useAuth()
  const navigate = useNavigate()
  const {
    data: inviteRequired,
    isLoading: inviteCheckLoading,
    isError: inviteCheckFailed,
  } = useInvitesRequired()
  const [state, setState] = useReducer(signUpReducer, signUpInitialState)
  const { name, email, password, inviteCode, loading } = state
  const requiresInvite = resolveInviteRequirement(inviteRequired, inviteCheckFailed)

  async function handleProviderSignIn(provider: "apple" | "google") {
    if (requiresInvite) {
      toast.error("Invite required", {
        description: getProviderInviteBlockMessage("sign-up"),
      })
      return
    }
    setState({ loading: true })
    const { error } = await signInWithProvider(provider)
    if (error) {
      setState({ loading: false })
      toast.error(`Couldn't sign in with ${provider === "apple" ? "Apple" : "Google"}`, {
        description: humanizeSupabaseError(error, "Try again or use a different method."),
      })
    }
    // On success the browser navigates to the provider; we never reach here.
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setState({ loading: true })

    if (requiresInvite) {
      const ok = await redeemInviteOrToast(inviteCode, email, (loading) => {
        setState({ loading })
      })
      if (!ok) {
        return
      }
    }

    const { error } = await signUp(email, password, name)
    setState({ loading: false })
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
        <div className="mb-8 text-center">
          <Link to="/" className="mb-4 inline-flex min-h-[44px] min-w-[44px] items-center gap-2">
            <div
              className="flex size-10 items-center justify-center rounded-md font-display text-lg font-medium text-primary-foreground"
              style={{ background: "var(--color-accent-primary)" }}
            >
              F
            </div>
          </Link>
          <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setState({ name: e.target.value })}
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
                  onChange={(e) => setState({ email: e.target.value })}
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
                  onChange={(e) => setState({ password: e.target.value })}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                className="min-h-[44px] w-full"
                disabled={loading || inviteCheckLoading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            {!requiresInvite && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] gap-2"
                    disabled={loading || inviteCheckLoading}
                    onClick={() => handleProviderSignIn("apple")}
                  >
                    <AppleIcon className="size-4" />
                    Apple
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] gap-2"
                    disabled={loading || inviteCheckLoading}
                    onClick={() => handleProviderSignIn("google")}
                  >
                    <GoogleIcon className="size-4" />
                    Google
                  </Button>
                </div>
              </>
            )}
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
