import { useEffect, useReducer } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"
import { useAuth } from "@/features/auth/stores/auth-store"
import { Card, CardContent } from "@/shared/components/ui/card"
import { resolveInAppRedirectTarget } from "@/shared/access-control"
import { resolveInviteRequirement, useInvitesRequired } from "@/features/auth/hooks/use-invites"
import {
  getProviderInviteBlockMessage,
  redeemInviteOrToast,
} from "@/features/auth/lib/auth-closed-beta"
import { RequestInviteDialog } from "@/features/auth/components/request-invite-dialog"
import { MagicLinkForm } from "@/features/auth/components/sign-in/magic-link-form"
import { MagicLinkSentPanel } from "@/features/auth/components/sign-in/magic-link-sent"
import { OAuthButtons } from "@/features/auth/components/sign-in/oauth-buttons"
import { PasswordSignInForm } from "@/features/auth/components/sign-in/password-form"
import { notifyError, notifySuccess, toast } from "@/shared/utils/toast"
import { AUTH_ERROR_MESSAGES, OAUTH_CALLBACK_FAILED_FLAG } from "@/features/auth/constants/messages"

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
  const { signIn, sendMagicLink, signInWithProvider, authError, clearAuthError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = resolveInAppRedirectTarget((location.state as { from?: unknown } | null)?.from)
  const {
    data: inviteRequired,
    isLoading: inviteCheckLoading,
    isError: inviteCheckFailed,
  } = useInvitesRequired()
  const requiresInvite = resolveInviteRequirement(inviteRequired, inviteCheckFailed)

  const [state, setState] = useReducer(signInReducer, signInInitialState)
  const { mode, email, password, inviteCode, loading } = state

  // Surface the OAuth callback failure flag so users who got bounced back
  // see why instead of staring at a silent sign-in form.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get(OAUTH_CALLBACK_FAILED_FLAG) === "1") {
      toast.error(AUTH_ERROR_MESSAGES.oauthFailedTitle, {
        description: AUTH_ERROR_MESSAGES.oauthFailedDescription,
      })
      const next = new URLSearchParams(searchParams)
      next.delete(OAUTH_CALLBACK_FAILED_FLAG)
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!authError) return
    toast.error(AUTH_ERROR_MESSAGES.signInInterruptedTitle, { description: authError })
    clearAuthError()
  }, [authError, clearAuthError])

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState({ loading: true })
    const { error } = await signIn(email, password)
    setState({ loading: false })
    if (error) {
      notifyError(error, AUTH_ERROR_MESSAGES.signInFallback, {
        title: AUTH_ERROR_MESSAGES.signInFailedTitle,
      })
    } else {
      notifySuccess(AUTH_ERROR_MESSAGES.welcomeBack)
      navigate(redirectTo, { replace: true })
    }
  }

  async function handleProviderSignIn(provider: "apple" | "google") {
    if (requiresInvite) {
      toast.error(AUTH_ERROR_MESSAGES.providerInviteRequiredTitle, {
        description: getProviderInviteBlockMessage("sign-in"),
      })
      return
    }
    setState({ loading: true })
    const { error } = await signInWithProvider(provider, { next: redirectTo })
    if (error) {
      setState({ loading: false })
      notifyError(error, AUTH_ERROR_MESSAGES.oauthProviderFailedFallback, {
        title: `Couldn't sign in with ${provider === "apple" ? "Apple" : "Google"}`,
      })
    }
    // On success the browser navigates to the provider; we never reach here.
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (requiresInvite) {
      setState({ loading: true })
      const ok = await redeemInviteOrToast(inviteCode, email, (loading) => {
        setState({ loading })
      })
      if (!ok) return
    } else {
      setState({ loading: true })
    }

    const { error } = await sendMagicLink(email, true)
    setState({ loading: false })
    if (error) {
      notifyError(error, AUTH_ERROR_MESSAGES.magicLinkSendFailedFallback, {
        title: AUTH_ERROR_MESSAGES.magicLinkSendFailedTitle,
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
              <MagicLinkSentPanel
                email={email}
                onBack={() => setState({ mode: "password", inviteCode: "" })}
              />
            ) : mode === "magic" ? (
              <MagicLinkForm
                email={email}
                inviteCode={inviteCode}
                loading={loading}
                inviteCheckLoading={inviteCheckLoading}
                requiresInvite={requiresInvite}
                onEmailChange={(value) => setState({ email: value })}
                onInviteCodeChange={(value) => setState({ inviteCode: value })}
                onSubmit={handleMagicLinkSubmit}
                onSwitchToPassword={() => setState({ mode: "password" })}
              />
            ) : (
              <PasswordSignInForm
                email={email}
                password={password}
                loading={loading}
                onEmailChange={(value) => setState({ email: value })}
                onPasswordChange={(value) => setState({ password: value })}
                onSubmit={handlePasswordSubmit}
                onSwitchToMagic={() => setState({ mode: "magic" })}
              />
            )}
            {mode !== "magic-sent" && !requiresInvite && (
              <OAuthButtons
                disabled={loading || inviteCheckLoading}
                onProviderClick={handleProviderSignIn}
              />
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
