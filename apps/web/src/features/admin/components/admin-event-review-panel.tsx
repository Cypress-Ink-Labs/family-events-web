import { Check, ExternalLink, Pencil, Sparkles, X, XCircle } from "lucide-react"
import { Link } from "react-router"
import type { EventAiTraceWithParsed, EventWithDetails, Tag as EventTag } from "@/shared/types"
import { safeHref, safeImageSrc } from "@/infrastructure/safe-url"
import { getFallbackImageUrl } from "@/features/events/lib/fallback-images"
import { cn, formatEventPrice, formatSlugLabel } from "@/shared/utils/format"
import { cleanDescription } from "@family-events/shared"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ClientDate } from "@/shared/components/client-date"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { LlmReviewSummary } from "@/features/admin/components/admin-event-review/llm-review-summary"
import { TagOverridesEditor } from "@/features/admin/components/admin-event-review/tag-overrides-editor"
import { AiTracePanel } from "@/features/admin/components/admin-event-review/ai-trace-panel"

interface ReviewDialogProps {
  event: EventWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTagIds: string[]
  allTags: EventTag[]
  tagNameById: Map<string, string>
  tagNameBySlug: Map<string, string>
  onToggleTag: (tagId: string) => void
  onSaveTags: () => void
  selectedEventTrace: EventAiTraceWithParsed | null
  isTraceLoading: boolean
  onPublish: () => void
  onReject: () => void
  onSetDraft: () => void
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  )
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Eyebrow>{label}</Eyebrow>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function decisionVariant(decision: string | null | undefined) {
  if (!decision) return "outline" as const
  if (decision.includes("approve") || decision === "auto_approve") return "default" as const
  if (decision.includes("reject")) return "destructive" as const
  return "secondary" as const
}

export function AdminEventReviewDialog({
  event,
  open,
  onOpenChange,
  editingTagIds,
  allTags,
  tagNameById,
  tagNameBySlug,
  onToggleTag,
  onSaveTags,
  selectedEventTrace,
  isTraceLoading,
  onPublish,
  onReject,
  onSetDraft,
}: ReviewDialogProps) {
  if (!event) {
    return <Sheet open={open} onOpenChange={onOpenChange} />
  }

  const confidenceRaw = event.llm_review_confidence ?? event.ai_confidence ?? 0
  const confidencePct = Math.round(Number(confidenceRaw) * 100)
  const heroImage =
    safeImageSrc(event.images?.[0]) ??
    getFallbackImageUrl(event.id, (event.tags ?? []).map((t) => t.tag.slug), 900, 360)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-full w-full flex-col gap-0 border-l border-border/60 bg-background p-0",
          "sm:max-w-[600px]"
        )}
      >
        {/* Cover + header */}
        <div className="relative">
          <div
            className="h-44 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close review panel"
          >
            <X className="size-4" />
          </button>
          <SheetHeader className="absolute inset-x-0 bottom-0 gap-2 p-5">
            <p className="font-mono text-2xs uppercase tracking-[0.18em] text-white/70">
              Review event
            </p>
            <SheetTitle className="font-display text-2xl leading-tight text-white">
              {event.title}
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant="outline" className="border-white/30 bg-black/30 text-white">
                {formatSlugLabel(event.status ?? "draft")}
              </Badge>
              {event.llm_review_decision ? (
                <Badge
                  variant={decisionVariant(event.llm_review_decision)}
                  className="border-transparent"
                >
                  <Sparkles className="size-3" />
                  {formatSlugLabel(event.llm_review_decision)}
                </Badge>
              ) : null}
              <Badge variant="outline" className="border-white/30 bg-black/30 text-white">
                AI {confidencePct}%
              </Badge>
            </div>
            {safeHref(event.source_url) !== "#" ? (
              <a
                href={safeHref(event.source_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 pt-1 font-mono text-2xs uppercase tracking-[0.14em] text-white/80 hover:text-white hover:underline"
              >
                {event.source_name ? `${event.source_name} · ` : ""}Go to event
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </SheetHeader>
        </div>

        {/* Tabs body */}
        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="border-b border-border/60 px-5 pt-4 pb-2">
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trace">AI Trace</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="overview"
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-32 pt-5 data-[state=inactive]:hidden"
          >
            <div className="space-y-6">
              <section className="grid grid-cols-2 gap-x-4 gap-y-5">
                <MetaRow
                  label="Date"
                  value={<ClientDate value={event.start_datetime} pattern="MMM d, h:mm a" />}
                />
                <MetaRow label="Venue" value={event.venue_name ?? "—"} />
                <MetaRow label="Price" value={formatEventPrice(event.price, event.is_free)} />
                <MetaRow label="AI confidence" value={`${confidencePct}%`} />
              </section>

              {event.description ? (
                <section className="space-y-2">
                  <Eyebrow>Description</Eyebrow>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {cleanDescription(event.description)}
                  </p>
                </section>
              ) : null}

              <section className="space-y-3">
                <LlmReviewSummary event={event} />
              </section>

              <section className="space-y-3">
                <TagOverridesEditor
                  event={event}
                  allTags={allTags}
                  editingTagIds={editingTagIds}
                  onToggleTag={onToggleTag}
                  onSaveTags={onSaveTags}
                />
              </section>
            </div>
          </TabsContent>

          <TabsContent
            value="trace"
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-32 pt-5 data-[state=inactive]:hidden"
          >
            <AiTracePanel
              trace={selectedEventTrace}
              isLoading={isTraceLoading}
              editingTagIds={editingTagIds}
              tagNameById={tagNameById}
              tagNameBySlug={tagNameBySlug}
            />
          </TabsContent>
        </Tabs>

        {/* Sticky action footer */}
        <div className="absolute inset-x-0 bottom-0 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to={`/admin/events/${event.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={onSetDraft}>
              <XCircle className="size-4" />
              Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onReject}
            >
              <X className="size-4" />
              Reject
            </Button>
            <Button size="sm" className="ml-auto gap-2" onClick={onPublish}>
              <Check className="size-4" />
              Publish
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
