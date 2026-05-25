import { lazy, Suspense, useEffect, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/app/providers/theme-provider"
import { useAuthStore } from "@/features/auth/stores/auth-store"
import { Toaster } from "@/shared/components/ui/sonner"
import { UpdateBanner } from "@/shared/components/update-banner"
import { VersionCheckRunner } from "@/shared/lib/app-version/use-version-check"
import { queryClient } from "@/infrastructure/queries/query-client"
import { AppMotionProvider } from "@/shared/components/motion"

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((module) => ({
        default: module.ReactQueryDevtools,
      }))
    )
  : null

function AuthInit() {
  useEffect(() => {
    const cleanup = useAuthStore.getState().initAuth()
    return cleanup
  }, [])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider storageKey="family-events-theme">
      <QueryClientProvider client={queryClient}>
        <AuthInit />
        <AppMotionProvider>{children}</AppMotionProvider>
        <UpdateBanner />
        <VersionCheckRunner />
        <Toaster richColors position="bottom-right" />
        {ReactQueryDevtools ? (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
