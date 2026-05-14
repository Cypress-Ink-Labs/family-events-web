import {
  ChartBar as BarChart3,
  Calendar,
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle,
  Circle as XCircle,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import type { ChartConfig } from "@/components/ui/chart"

const chartConfig: ChartConfig = {
  imported: { label: "Imported", color: "var(--chart-1)" },
  skipped: { label: "Skipped", color: "var(--chart-4)" },
  errors: { label: "Errors", color: "var(--chart-5)" },
}

export interface AdminDashboardStatCard {
  label: string
  value: number
  delta: string
  icon: typeof Calendar
  color: string
}

export interface AdminDashboardRecentRun {
  source: string
  status: string
  imported: number
  time: string
}

export interface AdminDashboardConfidenceItem {
  label: string
  value: number
}

interface AdminDashboardHeaderProps {
  title: string
  description: string
}

export function AdminDashboardHeader({ title, description }: AdminDashboardHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-muted-foreground text-sm mt-1">{description}</p>
    </div>
  )
}

interface AdminDashboardStatsGridProps {
  stats: AdminDashboardStatCard[]
  isLoading: boolean
}

export function AdminDashboardStatsGrid({ stats, isLoading }: AdminDashboardStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className={`size-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-extrabold text-foreground">
              {isLoading ? "..." : stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.delta}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface AdminDashboardIngestionChartProps {
  data: Array<{ day: string; imported: number; skipped: number; errors: number }>
}

export function AdminDashboardIngestionChart({ data }: AdminDashboardIngestionChartProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          Event Ingestion (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="imported" fill="var(--color-imported)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="skipped" fill="var(--color-skipped)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="errors" fill="var(--color-errors)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

interface AdminDashboardRecentRunsProps {
  runs: AdminDashboardRecentRun[]
  isLoading: boolean
}

export function AdminDashboardRecentRuns({ runs, isLoading }: AdminDashboardRecentRunsProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Recent Ingestion Runs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isLoading && runs.length === 0 && (
          <p className="text-sm text-muted-foreground">No ingestion runs yet.</p>
        )}
        {runs.map((run) => (
          <div
            key={`${run.source}-${run.time}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {run.status === "success" && (
                <CheckCircle className="size-4 text-green-600 shrink-0" />
              )}
              {run.status === "error" && <XCircle className="size-4 text-destructive shrink-0" />}
              {run.status === "partial" && (
                <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{run.source}</p>
                <p className="text-xs text-muted-foreground">{run.time}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <Badge
                variant={
                  run.status === "success"
                    ? "secondary"
                    : run.status === "error"
                      ? "destructive"
                      : "outline"
                }
                className="text-[10px]"
              >
                {run.status}
              </Badge>
              {run.imported > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">+{run.imported} events</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface AdminDashboardConfidenceCardProps {
  items: AdminDashboardConfidenceItem[]
  published: number
  pendingReview: number
}

export function AdminDashboardConfidenceCard({
  items,
  published,
  pendingReview,
}: AdminDashboardConfidenceCardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">AI Tagging Confidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-semibold">{item.value}%</span>
            </div>
            <Progress value={item.value} className="h-2" />
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2">
          {published} published events, {pendingReview} pending review.
        </p>
      </CardContent>
    </Card>
  )
}
