import { AlertTriangle, Bot, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ClientDate } from "@/components/client-date"
import { Skeleton } from "@/components/ui/skeleton"
import { formatProviderLabel } from "@/features/admin/utils/format-provider-label"
import { formatEventPrice } from "@/shared/utils/format"
import type { EventAiTraceWithParsed } from "@/shared/types"

interface AiTracePanelProps {
  trace: EventAiTraceWithParsed | null
  isLoading: boolean
  editingTagIds: string[]
  tagNameById: Map<string, string>
  tagNameBySlug: Map<string, string>
}

export function AiTracePanel({
  trace,
  isLoading,
  editingTagIds,
  tagNameById,
  tagNameBySlug,
}: AiTracePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <p className="text-sm font-semibold">AI Tagging Details</p>
      </div>

      {isLoading ? (
        <div className="space-y-2 rounded-xl border border-border/60 p-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : trace ? (
        <div className="space-y-4 rounded-xl border border-border/60 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Bot className="size-3" />
              {trace.provider ? formatProviderLabel(trace.provider) : "Unknown provider"}
            </Badge>
            {trace.model ? <Badge variant="outline">Model: {trace.model}</Badge> : null}
            <Badge variant="outline">Status: {trace.status}</Badge>
            <Badge variant="outline">
              Run: <ClientDate value={trace.created_at} pattern="MMM d, h:mm a" />
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Summary
              </p>
              <p className="mt-1 text-sm text-foreground">
                {trace.reasoning_summary ?? "No explanation was recorded."}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Fallback reason
              </p>
              <p className="mt-1 text-sm text-foreground">{trace.fallback_reason ?? "None"}</p>
            </div>
          </div>

          {trace.status !== "success" && trace.fallback_reason ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{trace.fallback_reason}</span>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                AI suggested tags
              </p>
              <div className="mt-2 space-y-2">
                {trace.parsed_predicted_tags.length > 0 ? (
                  trace.parsed_predicted_tags.map((tag) => (
                    <div key={tag.slug} className="rounded-lg border border-border/60 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {tagNameBySlug.get(tag.slug) ?? tag.slug}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(tag.confidence * 100)}%
                        </span>
                      </div>
                      {tag.reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">{tag.reason}</p>
                      ) : null}
                      {tag.matched_keywords?.length ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Keywords: {tag.matched_keywords.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No AI tag suggestions recorded.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Final admin tags
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {editingTagIds.length > 0 ? (
                  editingTagIds.map((tagId) => (
                    <Badge key={tagId} variant="outline">
                      {tagNameById.get(tagId) ?? tagId}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No final tags selected.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Extracted fields
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <div>
                  Age: {trace.parsed_predicted_fields?.age_min ?? "—"}
                  {trace.parsed_predicted_fields?.age_max !== null &&
                  trace.parsed_predicted_fields?.age_max !== undefined
                    ? ` to ${trace.parsed_predicted_fields.age_max}`
                    : ""}
                </div>
                <div>
                  Price:{" "}
                  {formatEventPrice(
                    trace.parsed_predicted_fields?.price ?? null,
                    trace.parsed_predicted_fields?.is_free ?? false
                  )}
                </div>
                <div>Venue: {trace.parsed_predicted_fields?.venue_name ?? "—"}</div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Classification input
              </p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{trace.input_title}</p>
                <p>{trace.input_description ?? "No description captured."}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No AI trace has been recorded for this event yet.
        </div>
      )}
    </div>
  )
}
