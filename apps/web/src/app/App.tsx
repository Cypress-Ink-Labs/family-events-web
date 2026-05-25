import { Suspense, useEffect } from "react"
import { RouterProvider } from "react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/app/providers/theme-provider"
import { useAuthStore } from "@/features/auth/stores/auth-store"
import { Toaster } from "@/shared/components/ui/sonner"
import { UpdateBanner } from "@/shared/components/update-banner"
import { VersionCheckRunner } from "@/shared/lib/app-version/use-version-check"
import { queryClient } from "@/infrastructure/queries/query-client"
import { AppMotionProvider } from "@/shared/components/motion"
import { router } from "@/app/router"
import { lazy } from "react"

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

export default function App() {
  return (
    <ThemeProvider storageKey="family-events-theme">
      <QueryClientProvider client={queryClient}>
        <AuthInit />
        <AppMotionProvider>
          <RouterProvider router={router} />
        </AppMotionProvider>
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
