import { Bot } from "lucide-react"
import { ClientDate } from "@/components/client-date"
import type { EventWithDetails } from "@/lib/types"

export function LlmReviewSummary({ event }: { event: EventWithDetails }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-primary" />
        <p className="text-sm font-semibold">LLM Review</p>
      </div>
      <div className="rounded-xl border border-border/60 p-4 space-y-2 text-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            <span className="font-medium">{event.llm_review_status ?? "not_required"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Decision:</span>{" "}
            <span className="font-medium">{event.llm_review_decision ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Confidence:</span>{" "}
            <span className="font-medium">
              {event.llm_review_confidence == null
                ? "—"
                : Number(event.llm_review_confidence).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Reviewed:</span>{" "}
            <span className="font-medium">
              {event.llm_reviewed_at ? (
                <ClientDate value={event.llm_reviewed_at} pattern="MMM d, h:mm a" />
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Reason:</span>{" "}
          <span className="font-medium">{event.llm_review_reason ?? "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Flags:</span>{" "}
          <span className="font-medium">
            {event.llm_review_flags?.length ? event.llm_review_flags.join(", ") : "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Provider/Model:</span>{" "}
          <span className="font-medium">
            {event.llm_review_provider ?? "—"}
            {event.llm_review_model ? ` · ${event.llm_review_model}` : ""}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Prompt:</span>{" "}
          <span className="font-medium">{event.llm_review_prompt_version ?? "—"}</span>
        </div>
        {event.llm_review_error ? (
          <div className="text-destructive">
            <span className="text-muted-foreground">Error:</span>{" "}
            <span className="font-medium">{event.llm_review_error}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
