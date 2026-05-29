import { Component, type ErrorInfo, type ReactNode } from "react"
import { useLocation } from "react-router"
import { AlertTriangle, RefreshCcw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Sentry } from "@/infrastructure/observability/sentry"
import { isDynamicImportError } from "@/shared/lib/app-version/version-check"
import { updateStore } from "@/shared/lib/app-version/update-store"

type InnerProps = {
  children: ReactNode
  resetKey: string
}

type ErrorBoundaryState = {
  hasError: boolean
  errorMessage: string | null
  isUpdateError: boolean
  // Tracks the most recent resetKey we've reconciled so getDerivedStateFromProps
  // can detect navigation while a captured error is still on screen.
  lastResetKey: string
}

class AppErrorBoundaryInner extends Component<InnerProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
    isUpdateError: false,
    lastResetKey: this.props.resetKey,
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error.message,
      isUpdateError: isDynamicImportError(error),
    }
  }

  static getDerivedStateFromProps(
    props: InnerProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    // Clear a captured error when navigation moves us to a new route. Prop-
    // driven reset (vs. key={pathname} remount) keeps the descendant tree's
    // local state intact across normal navigation.
    if (props.resetKey !== state.lastResetKey) {
      return state.hasError
        ? {
            hasError: false,
            errorMessage: null,
            isUpdateError: false,
            lastResetKey: props.resetKey,
          }
        : { lastResetKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Dynamic-import failures during a deploy window are not bugs — surface the
    // update prompt instead of paging Sentry.
    if (isDynamicImportError(error)) {
      updateStore.getState().markUpdateAvailable("chunk-error")
      return
    }

    Sentry.withScope((scope) => {
      scope.setLevel("fatal")
      scope.setContext("react", {
        componentStack: errorInfo.componentStack,
      })
      Sentry.captureException(error)
    })

    console.error("Unhandled UI error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.isUpdateError) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-16">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <RefreshCcw className="size-6 text-primary" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                A new version of this site is available
              </h1>
              <p className="text-sm text-muted-foreground">
                The page you tried to open is part of the new version. Reload to continue.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => window.location.reload()}>Update now</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (this.state.hasError) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-16">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-6 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                We hit an unexpected error while rendering this page.
              </p>
              {import.meta.env.DEV && this.state.errorMessage && (
                <p className="text-xs text-destructive font-mono bg-destructive/10 rounded-md px-3 py-2 break-all">
                  {this.state.errorMessage}
                </p>
              )}
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => window.location.assign("/")}>
                  Back to home
                </Button>
                <Button onClick={() => window.location.reload()}>Reload page</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <AppErrorBoundaryInner resetKey={location.pathname}>{children}</AppErrorBoundaryInner>
}
