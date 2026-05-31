import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useDocumentTitle } from "@/shared/hooks/use-document-title"
import { useAuth } from "@/features/auth/stores/auth-store"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent } from "@/shared/components/ui/card"
import { HOME_PATH } from "@/shared/access-control"
import { humanizeSupabaseError } from "@/infrastructure/supabase/errors"
import { supabase } from "@/infrastructure/supabase/client"
import { BrandLogo } from "@/shared/components/brand-logo"
import { toast } from "sonner"

export function ResetPasswordPage() {
  useDocumentTitle("Reset Password")

  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null)

  // Supabase fires PASSWORD_RECOVERY synchronously after parsing the URL hash
  // tokens, so we listen briefly before deciding whether to show the form vs
  // an expired-link message.
  useEffect(() => {
    let resolved = false
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "INITIAL_SESSION" && session)) {
        resolved = true
        setHasRecoverySession(true)
      }
    })

    // Fallback: if the SDK already restored the session before we subscribed,
    // peek at the current session.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!resolved) {
        setHasRecoverySession(Boolean(session))
      }
    })

    return () => data.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (password !== confirm) {
      toast.error("Passwords don't match")
      return
    }

    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      toast.error("Couldn't update password", {
        description: humanizeSupabaseError(error, "Try again."),
      })
      return
    }
    toast.success("Password updated", { description: "You're signed in with your new password." })
    navigate(HOME_PATH, { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <BrandLogo showText={false} className="mb-4 justify-center" markClassName="size-10" />
          <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick something you'll actually remember this time.
          </p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-6">
            {hasRecoverySession === false ? (
              <div className="space-y-3 text-sm">
                <p className="text-foreground font-medium">This link isn't valid</p>
                <p className="text-muted-foreground">
                  Your reset link may have expired or already been used.
                </p>
                <Button asChild className="min-h-[44px] w-full">
                  <Link to="/forgot-password">Request a new link</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type it again"
                    required
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="min-h-[44px] w-full"
                  disabled={loading || hasRecoverySession === null}
                >
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
