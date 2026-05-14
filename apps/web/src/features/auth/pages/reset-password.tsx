import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/features/auth/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { HOME_PATH } from "@/lib/access-control"
import { humanizeSupabaseError } from "@/lib/humanize-supabase-error"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export function ResetPasswordPage() {
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
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
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
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-lg font-black">F</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground">Set a new password</h1>
          <p className="text-muted-foreground text-sm mt-1">
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
                <Button asChild className="w-full">
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
                    autoFocus
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
                  className="w-full"
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
