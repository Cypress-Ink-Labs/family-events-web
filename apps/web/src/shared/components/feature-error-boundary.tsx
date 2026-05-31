import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

interface FeatureErrorBoundaryProps {
  /** Human-readable feature name shown in the fallback UI. */
  featureName: string
  children: ReactNode
}

interface FeatureErrorBoundaryState {
  hasError: boolean
  errorMessage: string | null
}

/**
 * Per-feature error boundary that catches crashes inside a single route group
 * without taking down the rest of the app.
 *
 * - Renders a recovery card with retry button on error.
 * - Shows the error message in development mode.
 * - Logs to console (Sentry picks up unhandled errors separately at the
 *   AppErrorBoundary level for fatal crashes; feature-level ones are logged
 *   here for diagnostics).
 */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  state: FeatureErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  }

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[FeatureErrorBoundary:${this.props.featureName}]`,
      error,
      errorInfo.componentStack
    )
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {this.props.featureName} hit an error
            </h2>
            <p className="text-sm text-muted-foreground">
              Something went wrong loading this section. The rest of the app is unaffected.
            </p>
            {import.meta.env.DEV && this.state.errorMessage && (
              <p className="break-all rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
                {this.state.errorMessage}
              </p>
            )}
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => window.location.assign("/")}>
                Back to home
              </Button>
              <Button onClick={this.handleRetry}>
                <RefreshCcw className="mr-1.5 size-4" />
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
