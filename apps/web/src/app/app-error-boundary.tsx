import { Component, type ErrorInfo, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sentry } from "@/lib/sentry"

type InnerProps = {
  children: ReactNode
  resetKey: string
}

type ErrorBoundaryState = {
  hasError: boolean
  errorMessage: string | null
  // Tracks the most recent resetKey we've reconciled so getDerivedStateFromProps
  // can detect navigation while a captured error is still on screen.
  lastResetKey: string
}

class AppErrorBoundaryInner extends Component<InnerProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
    lastResetKey: this.props.resetKey,
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error.message,
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
        ? { hasError: false, errorMessage: null, lastResetKey: props.resetKey }
        : { lastResetKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
    if (this.state.hasError) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-16">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                We hit an unexpected error while rendering this page.
              </p>
              {this.state.errorMessage && (
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
