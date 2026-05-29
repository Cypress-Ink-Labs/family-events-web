import { Brain, ShieldCheck, Sparkles, TrendingDown } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Progress } from "@/shared/components/ui/progress"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { PipelineLearningStats } from "@/features/admin/hooks/operations/use-admin-pipeline-stats"

interface AdminPipelineLearningProps {
  stats: PipelineLearningStats | undefined
  isLoading: boolean
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function FeatureFlagBadge({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <Badge variant={enabled ? "default" : "outline"} className="text-xs">
      {name}: {enabled ? "on" : "off"}
    </Badge>
  )
}

export function AdminPipelineLearning({ stats, isLoading }: AdminPipelineLearningProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4" />
            Pipeline Learning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  const totalDecisions = stats.llm_reviewed + stats.admin_reviewed
  const automationRate =
    totalDecisions > 0 ? Math.round((stats.llm_reviewed / totalDecisions) * 100) : 0

  const flags = stats.feature_flags ?? {}

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="size-4" />
          Pipeline Learning
          <span className="text-xs font-normal text-[var(--color-text-muted)]">
            Last {stats.window_days} days
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Automation rate */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[var(--color-accent-primary)]" />
              Automation rate
            </span>
            <span className="font-semibold tabular-nums">{automationRate}%</span>
          </div>
          <Progress value={automationRate} className="h-1.5" />
        </div>

        {/* Key metrics */}
        <div className="space-y-1.5">
          <MetricRow label="LLM reviewed" value={stats.llm_reviewed} />
          <MetricRow label="Admin reviewed" value={stats.admin_reviewed} />
          <MetricRow label="Auto-rejected (bad sources)" value={stats.auto_rejected} />
          <MetricRow label="Memory hits (review)" value={stats.memory_hits} />
          <MetricRow label="Memory hits (tagging)" value={stats.tag_memory_hits} />
          <MetricRow label="Total embeddings" value={stats.total_embeddings} />
        </div>

        {/* Top rejection sources */}
        {stats.top_rejection_sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <TrendingDown className="size-3.5 text-destructive" />
              Top rejection sources
            </p>
            <div className="space-y-1">
              {stats.top_rejection_sources.slice(0, 5).map((src) => (
                <div key={src.source_id} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[60%] text-[var(--color-text-muted)]">
                    {src.source_name}
                  </span>
                  <span className="font-mono tabular-nums">
                    {src.rejection_rate}% ({src.rejected}/{src.total})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature flags */}
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ShieldCheck className="size-3.5" />
            Memory features
          </p>
          <div className="flex flex-wrap gap-1.5">
            <FeatureFlagBadge name="tag-memory" enabled={flags["tag-memory"] ?? false} />
            <FeatureFlagBadge name="review-memory" enabled={flags["review-memory"] ?? false} />
            <FeatureFlagBadge
              name="source-auto-reject"
              enabled={flags["source-auto-reject"] ?? false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
