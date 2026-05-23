import { Bot, Sparkles } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "@/shared/components/ui/badge"
import { ClientDate } from "@/shared/components/client-date"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { cn } from "@/shared/utils/format"
import type { Event, EventAiTraceWithParsed } from "@/shared/types"
import { formatProviderLabel } from "@/features/admin/utils/format-provider-label"
import { formatEventFieldLabel } from "@/features/admin/lib/event-field-locks"

export function AdminEventEditSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

export function EventStatusBadge({ status }: { status: Event["status"] }) {
  const classes: Record<Event["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-destructive/10 text-destructive",
    archived: "bg-muted/50 text-muted-foreground",
  }
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", classes[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function LockedFieldsSummary({
  fields,
  onUnlock,
  isUnlocking,
}: {
  fields: string[]
  onUnlock: () => void
  isUnlocking: boolean
}) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{fields.length} scraper-protected fields</p>
        {fields.length > 0 ? (
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
            onClick={onUnlock}
            disabled={isUnlocking}
          >
            Unlock all fields
          </button>
        ) : null}
      </div>
      {fields.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fields.map((field) => (
            <Badge key={field} variant="outline">
              {formatEventFieldLabel(field)}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Future source runs may update imported fields until an admin saves changes.
        </p>
      )}
    </div>
  )
}

export function AdminEventAiReference({
  trace,
  isLoading,
}: {
  trace: EventAiTraceWithParsed | null
  isLoading: boolean
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" />
          AI classification reference
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <p className="text-muted-foreground">Loading classification details…</p>
        ) : trace ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Bot className="size-3" />
                {formatProviderLabel(trace.provider)}
              </Badge>
              {trace.model ? <Badge variant="outline">Model: {trace.model}</Badge> : null}
              <Badge variant="outline">Status: {trace.status}</Badge>
              <Badge variant="outline">
                Run: <ClientDate value={trace.created_at} pattern="MMM d, h:mm a" />
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {trace.reasoning_summary ?? "No reasoning summary recorded."}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {trace.parsed_predicted_tags.length > 0 ? (
                trace.parsed_predicted_tags.map((tag) => (
                  <Badge key={tag.slug} variant="outline">
                    {tag.slug} {Math.round(tag.confidence * 100)}%
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">No predicted tags recorded.</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">No AI trace has been recorded for this event.</p>
        )}
      </CardContent>
    </Card>
  )
}
