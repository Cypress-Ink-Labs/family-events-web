import { Bot, Check, Eye, Pencil, Tag, X, XCircle } from "lucide-react"
import { Link } from "react-router"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { ClientDate } from "@/shared/components/client-date"
import { AgeRangeBadge } from "@/features/events/components/tag-badge"
import { formatProviderLabel } from "@/features/admin/utils/format-provider-label"
import { safeImageSrc } from "@/infrastructure/safe-url"
import { cn, formatSlugLabel } from "@/shared/utils/format"
import type { Event } from "@/shared/types"
import { buildLlmReviewBadge } from "@/features/admin/components/admin-events-list/llm-review-badge"
import { LLM_EVENT_REVIEW_DECISION, LLM_EVENT_REVIEW_STATUS } from "@/shared/constants/llm-review"

interface AdminVirtualEventRowProps {
  event: Event
  cityName: string
  isSelected: boolean
  statusConfig: Record<Event["status"], { label: string; color: string }>
  onToggleSelect: (id: string) => void
  onOpenReview: (event: Event) => void
  onUpdateStatus: (id: string, status: Event["status"]) => void
}

export function AdminVirtualEventRow({
  event,
  cityName,
  isSelected,
  statusConfig,
  onToggleSelect,
  onOpenReview,
  onUpdateStatus,
}: AdminVirtualEventRowProps) {
  const imageUrl = safeImageSrc(event.images?.[0])
  const status = statusConfig[event.status]
  const llmBadge = buildLlmReviewBadge(event)
  const reviewProviderLabel = formatSlugLabel(event.llm_review_provider)
  const tagProviderLabel = formatProviderLabel(event.ai_tag_provider)
  const modelLabel =
    llmBadge && event.llm_review_model
      ? `${reviewProviderLabel} • ${event.llm_review_model}`
      : `${tagProviderLabel}${event.ai_tag_model ? ` • ${event.ai_tag_model}` : ""}`
  const aiConfidence =
    event.ai_confidence == null ? null : `${Math.round(event.ai_confidence * 100)}%`

  return (
    <article
      className={cn(
        "rounded-xl border border-border/60 bg-background p-3 transition-colors",
        isSelected && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex gap-3 items-start">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(event.id)}
          className="mt-1 shrink-0"
          aria-label={`Select ${event.title}`}
        />

        <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={event.title}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2">
            <h3 className="font-bold text-sm text-foreground leading-tight flex-1 min-w-0">
              {event.title}
            </h3>
            <span
              className={cn(
                "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full",
                status.color
              )}
            >
              {status.label}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span>
              <ClientDate value={event.start_datetime} pattern="MMM d, h:mm a" />
            </span>
            <span>{event.venue_name ?? "No venue"}</span>
            <Badge variant="outline" className="text-[10px]">
              {cityName}
            </Badge>
          </div>

          {event.status === "draft" && (
            <>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Bot className="size-3" />
                  <span>{modelLabel}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Tag className="size-3" />
                  {aiConfidence ? `Confidence ${aiConfidence}` : "Confidence n/a"}
                </span>
                <span
                  className={cn(
                    "rounded-full border border-border px-2 py-0.5 text-[10px]",
                    event.ai_tag_status === "success" ? "text-emerald-700" : "text-amber-600"
                  )}
                >
                  AI {formatSlugLabel(event.ai_tag_status ?? "pending")}
                </span>
                {llmBadge ? (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      llmBadge.className
                    )}
                    title={event.llm_review_reason ?? undefined}
                  >
                    {llmBadge.text}
                  </span>
                ) : null}
              </div>
              {event.llm_review_status === LLM_EVENT_REVIEW_STATUS.FAILED ||
              (event.llm_review_status !== LLM_EVENT_REVIEW_STATUS.NOT_REQUIRED &&
                event.llm_review_decision === LLM_EVENT_REVIEW_DECISION.NEEDS_ADMIN_REVIEW) ? (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {event.llm_review_error ?? event.llm_review_reason ?? "Routed to admin review"}
                </p>
              ) : null}
            </>
          )}

          <div className="flex items-center gap-1.5">
            <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1 self-start">
          <Button variant="ghost" size="icon" aria-label="Edit event" className="size-8" asChild>
            <Link to={`/admin/events/${event.id}/edit`}>
              <Pencil className="size-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Review event"
            className="size-8"
            onClick={() => onOpenReview(event)}
          >
            <Eye className="size-3.5" />
          </Button>
          {event.status === "draft" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Publish event"
                className="size-8 text-[var(--color-success)] hover:bg-[var(--color-success)]/8 hover:text-[var(--color-success)]"
                onClick={() => onUpdateStatus(event.id, "published")}
              >
                <Check className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reject event"
                className="size-8 text-destructive hover:bg-destructive/10"
                onClick={() => onUpdateStatus(event.id, "rejected")}
              >
                <X className="size-3.5" />
              </Button>
            </>
          )}
          {event.status === "published" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Archive event"
              className="size-8 text-destructive hover:bg-destructive/10"
              onClick={() => onUpdateStatus(event.id, "archived")}
            >
              <XCircle className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
