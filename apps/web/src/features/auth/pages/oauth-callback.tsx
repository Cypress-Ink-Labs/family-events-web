import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useAuth, useAuthStore } from "@/features/auth/stores/auth-store"
import { HOME_PATH } from "@/lib/access-control"

/**
 * OAuth providers (Apple, Google) bounce back here with the session payload
 * encoded in either the URL hash (#access_token=…) or as ?code=… (PKCE).
 * supabase-js parses both automatically; we just have to render a loading
 * state and route forward once the session lands in the store.
 */
export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const session = useAuth().session

  useEffect(() => {
    if (session) {
      navigate(HOME_PATH, { replace: true })
    }
  }, [session, navigate])

  // Hard fallback: if no session after 8s, send the user back to /sign-in
  // with a humanized hint instead of leaving them on an empty loader.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!useAuthStore.getState().session) {
        navigate("/sign-in?oauth_failed=1", { replace: true })
      }
    }, 8000)
    return () => window.clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="border-border/60 w-full max-w-sm">
        <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="font-display text-base">Finishing sign-in…</p>
          <p className="text-xs text-muted-foreground">One moment while we confirm your account.</p>
        </CardContent>
      </Card>
    </div>
  )
}
