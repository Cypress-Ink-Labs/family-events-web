import { useEffect, useMemo, useRef } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CalendarDays, MapPin, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlanHeroCard } from "@/features/plan/components/plan-hero-card"
import { PlanThumbCard } from "@/features/plan/components/plan-thumb-card"
import { WeatherStrip } from "@/features/plan/components/weather-strip"
import { FadeSwap, StaggerItem, StaggerList } from "@/components/motion"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useApp } from "@/app/stores/app-store"
import { usePlanForToday } from "@/features/plan/hooks/use-plan-for-today"
import { humanizeSupabaseError } from "@/lib/humanize-supabase-error"
import { toast } from "sonner"

function planExploreHref(date: string | null, weatherFit: string): string {
  const params = new URLSearchParams()
  if (date) {
    params.set("date", date)
  }
  params.set("dist", "15")
  if (weatherFit !== "any") {
    params.set("fit", weatherFit)
  }
  const query = params.toString()
  return query ? `/explore?${query}` : "/explore"
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-44 animate-pulse rounded bg-muted" />
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}

interface PlanContextBarProps {
  cityName: string | null | undefined
  childAge: number | null | undefined
}

function PlanContextBar({ cityName, childAge }: PlanContextBarProps) {
  const chips = [
    {
      icon: MapPin,
      label: cityName?.trim() || "Nearby",
    },
    {
      icon: CalendarDays,
      label: "Today + 7 days",
    },
    {
      icon: Sparkles,
      label: childAge == null ? "Weather-aware" : `Age ${childAge} fit`,
    },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
        >
          <chip.icon className="h-3.5 w-3.5 text-primary" />
          {chip.label}
        </div>
      ))}
    </div>
  )
}

export function SaturdayPlanPage() {
  const { user, profile } = useAuth()
  const { selectedCity } = useApp()
  const errorToastRef = useRef(false)
  const prevErrorRef = useRef<unknown>(null)

  const {
    data: plan,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = usePlanForToday({
    userId: user?.id,
    selectedCity,
    childAge: profile?.child_age ?? null,
  })

  useEffect(() => {
    if (!isError) {
      errorToastRef.current = false
      prevErrorRef.current = null
      return
    }
    if (prevErrorRef.current !== error) {
      errorToastRef.current = false
      prevErrorRef.current = error
    }
    if (errorToastRef.current) {
      return
    }
    errorToastRef.current = true
    toast.error("We couldn't load this week's plan.", {
      description: humanizeSupabaseError(error, "Tap retry to try again."),
    })
  }, [error, isError])

  const exploreHref = useMemo(
    () => planExploreHref(plan?.date ?? null, plan?.weatherFit ?? "any"),
    [plan?.date, plan?.weatherFit]
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          This week's plan
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {profile?.child_name
            ? `Best family options for ${profile.child_name} this week`
            : "Best family options this week"}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A ranked shortlist from the next 7 days, tuned by distance, weather, age fit, and saved
          events.
        </p>
        <PlanContextBar cityName={selectedCity?.name} childAge={profile?.child_age ?? null} />
        <WeatherStrip
          date={plan?.date ?? null}
          cityName={selectedCity?.name}
          weather={plan?.weather ?? null}
        />
      </div>

      <FadeSwap
        stateKey={isLoading ? "plan-loading" : isError ? "plan-error" : "plan-content"}
        className="space-y-5"
      >
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm text-destructive">
                We couldn't load this week's plan right now.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  void refetch()
                }}
              >
                <RefreshCw className="h-4 w-4" />
                {isRefetching ? "Retrying..." : "Retry"}
              </Button>
            </CardContent>
          </Card>
        ) : plan ? (
          <>
            {plan.fallbackMessage ? (
              <Card className="border-border/60">
                <CardContent className="p-3 text-sm text-muted-foreground">
                  {plan.fallbackMessage}
                </CardContent>
              </Card>
            ) : null}

            {plan.heroEvent ? (
              <PlanHeroCard event={plan.heroEvent} />
            ) : (
              <Card className="border-border/60">
                <CardContent className="space-y-3 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No family plans found nearby in the next 7 days.
                  </p>
                  <Button asChild>
                    <Link to="/explore">Explore events</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {plan.secondaryEvents.length > 0 ? (
              <StaggerList className="grid gap-3 sm:grid-cols-2">
                {plan.secondaryEvents.map((event) => (
                  <StaggerItem key={event.id}>
                    <PlanThumbCard event={event} />
                  </StaggerItem>
                ))}
              </StaggerList>
            ) : null}

            <div className="flex justify-end">
              <Button variant="ghost" className="gap-1 text-primary" asChild>
                <Link to={exploreHref}>
                  See more options
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        ) : null}
      </FadeSwap>
    </div>
  )
}
