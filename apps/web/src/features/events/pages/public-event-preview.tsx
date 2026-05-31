import { Link, useParams } from "react-router"
import { useDocumentTitle } from "@/shared/hooks/use-document-title"
import { format } from "date-fns"
import { CalendarDays, MapPin } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import type { PublicEventRow } from "@/lib/db"
import { supabase } from "@/infrastructure/supabase/client"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cleanDescription } from "@family-events/shared"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function asImageUrl(images: unknown): string | null {
  if (!Array.isArray(images)) {
    return null
  }
  const firstHttps = images.find(
    (value): value is string => typeof value === "string" && value.startsWith("https://")
  )
  return firstHttps ?? null
}

export function PublicEventPreviewPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const isValidId = Boolean(eventId && UUID_PATTERN.test(eventId))

  const {
    data: event,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["public-event-preview", eventId],
    enabled: isValidId,
    queryFn: async (): Promise<PublicEventRow | null> => {
      if (!eventId) {
        return null
      }
      const { data, error } = await supabase
        .from("public_events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle()
      if (error) {
        throw error
      }
      return data
    },
  })

  useDocumentTitle(event?.title ?? "Event Preview")

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <Card className="w-full border-border/60">
          <CardContent className="p-6 text-sm text-muted-foreground">Loading preview…</CardContent>
        </Card>
      </div>
    )
  }

  const imageUrl = asImageUrl(event?.images) || "/og-fallback.png"

  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <Card className="w-full border-border/60">
          <CardContent className="space-y-3 p-6 text-center">
            <h1 className="text-xl font-semibold text-foreground">
              We couldn't load this event preview.
            </h1>
            <p className="text-sm text-muted-foreground">
              {import.meta.env.DEV && error instanceof Error ? error.message : "Please try again."}
            </p>
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => {
                  void refetch()
                }}
              >
                Retry
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event || !event.id) {
    const fallbackSignupHref = eventId
      ? `/sign-up?redirect=${encodeURIComponent(`/events/${eventId}`)}`
      : "/sign-up"
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <Card className="w-full border-border/60">
          <CardContent className="space-y-3 p-6 text-center">
            <h1 className="text-xl font-semibold text-foreground">
              This event is no longer available.
            </h1>
            <p className="text-sm text-muted-foreground">
              Open Family Events to see current plans for your family.
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild>
                <Link to={fallbackSignupHref}>Open in Family Events</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const signupHref = `/sign-up?redirect=${encodeURIComponent(`/events/${event.id}`)}`
  const eventDate = (() => {
    if (!event.start_datetime) return null
    const parsed = new Date(event.start_datetime)
    return Number.isNaN(parsed.getTime()) ? null : format(parsed, "EEEE, MMM d · h:mm a")
  })()

  return (
    <div className="bg-background py-8">
      <div className="mx-auto max-w-3xl space-y-4 px-4">
        <Card className="overflow-hidden border-border/60">
          <img
            src={imageUrl}
            alt={event.title ?? "Family event"}
            className="h-64 w-full object-cover"
          />
          <CardContent className="space-y-4 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Shared plan
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {event.title ?? "Family event"}
            </h1>
            {(() => {
              const cleaned = cleanDescription(event.description)
              return cleaned ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{cleaned}</p>
              ) : null
            })()}
            <div className="space-y-1 text-sm text-muted-foreground">
              {eventDate ? (
                <p className="inline-flex items-center gap-1">
                  <CalendarDays className="size-4" />
                  {eventDate}
                </p>
              ) : null}
              {event.venue_name ? (
                <p className="inline-flex items-center gap-1">
                  <MapPin className="size-4" />
                  {event.venue_name}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link to={signupHref}>Open in Family Events</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Learn more</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
