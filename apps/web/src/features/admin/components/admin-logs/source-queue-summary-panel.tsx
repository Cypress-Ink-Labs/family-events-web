import { Database } from "lucide-react"
import { useAdminSourceQueueSummary } from "@/features/admin/hooks/sources/use-admin-source-queue"
import { SOURCE_QUEUE_ORDER, SOURCE_QUEUE_STATUS_LABELS } from "@/features/admin/constants/queue"
import { QUEUE_STATUS_TONE } from "@/shared/constants/status-colors"
import { QueueSummaryPanel } from "@/features/admin/components/admin-logs/queue-summary-panel"

export function SourceQueueSummaryPanel() {
  const { data: rows = [], isLoading } = useAdminSourceQueueSummary()
  return (
    <QueueSummaryPanel
      title="Source scrape queue"
      icon={Database}
      rows={rows}
      isLoading={isLoading}
      order={SOURCE_QUEUE_ORDER}
      labels={SOURCE_QUEUE_STATUS_LABELS}
      tones={QUEUE_STATUS_TONE}
      deadStatus="dead"
      activeTimestampKey="oldest_processing_started_at"
    />
  )
}
