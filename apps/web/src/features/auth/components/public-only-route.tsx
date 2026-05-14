import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/features/auth/stores/auth-store"
import { HOME_PATH } from "@/lib/access-control"
import { FadeSwap } from "@/components/motion"

// Same intent / guard rules as sign-in.tsx: only in-app absolute paths are
// honored. Anything else falls back to HOME_PATH to avoid an open redirect
// triggered by manipulated history state.
function resolveRedirectTarget(rawFrom: unknown): string {
  if (typeof rawFrom !== "string") return HOME_PATH
  if (!rawFrom.startsWith("/") || rawFrom.startsWith("//")) return HOME_PATH
  return rawFrom
}

export function PublicOnlyRoute() {
  const { user, isEnabled, isLoading } = useAuth()
  const location = useLocation()
  const redirectTo = resolveRedirectTarget((location.state as { from?: unknown } | null)?.from)

  if (isLoading) {
    return (
      <FadeSwap stateKey="public-loading">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </FadeSwap>
    )
  }

  if (user && isEnabled) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <FadeSwap stateKey="public-content">
      <Outlet />
    </FadeSwap>
  )
}
