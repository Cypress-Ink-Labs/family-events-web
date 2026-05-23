import type { ElementType } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ClientDistanceToNow } from "@/components/client-date"
import { cn } from "@/shared/utils/format"

export interface QueueSummaryRow<Status extends string> {
  status: Status
  row_count: number
  oldest_enqueued_at: string | null
  oldest_processing_started_at?: string | null
}

interface QueueSummaryPanelProps<Status extends string> {
  title: string
  icon: ElementType
  rows: QueueSummaryRow<Status>[]
  isLoading: boolean
  order: readonly Status[]
  labels: Record<Status, string>
  tones: Record<Status, string>
  deadStatus: Status
  activeTimestampKey?: "oldest_processing_started_at"
}

export function QueueSummaryPanel<Status extends string>({
  title,
  icon: Icon,
  rows,
  isLoading,
  order,
  labels,
  tones,
  deadStatus,
  activeTimestampKey,
}: QueueSummaryPanelProps<Status>) {
  const byStatus = new Map<Status, QueueSummaryRow<Status>>(rows.map((row) => [row.status, row]))
  const dead = byStatus.get(deadStatus)

  if (isLoading && rows.length === 0) return null

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {dead && dead.row_count > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {dead.row_count} dead-lettered
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {order.map((status) => {
            const row = byStatus.get(status)
            return (
              <div
                key={status}
                className={cn("rounded-md border px-3 py-2", tones[status], !row && "opacity-60")}
              >
                <div className="text-[10px] uppercase tracking-wide font-semibold">
                  {labels[status]}
                </div>
                <div className="text-lg font-bold tabular-nums">{row?.row_count ?? 0}</div>
                {row?.oldest_enqueued_at && (
                  <div className="text-[10px] mt-0.5">
                    oldest <ClientDistanceToNow value={row.oldest_enqueued_at} addSuffix />
                  </div>
                )}
                {activeTimestampKey && row?.[activeTimestampKey] && (
                  <div className="text-[10px] mt-0.5">
                    active <ClientDistanceToNow value={row[activeTimestampKey]} addSuffix />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
