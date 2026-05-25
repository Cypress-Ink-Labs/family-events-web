import { FadeSwap } from "@/shared/components/motion"

export function RouteFallback() {
  return (
    <FadeSwap stateKey="route-fallback">
      <div className="min-h-[50vh] bg-background px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-36 animate-pulse rounded-lg border bg-card" />
            <div className="h-36 animate-pulse rounded-lg border bg-card" />
            <div className="h-36 animate-pulse rounded-lg border bg-card" />
          </div>
        </div>
      </div>
    </FadeSwap>
  )
}
