import { Tag as TagIcon } from "lucide-react"
import { useAdminTagQueueSummary } from "@/features/admin/hooks/operations/use-admin-tag-queue"
import { TAG_QUEUE_ORDER, TAG_QUEUE_STATUS_LABELS } from "@/features/admin/constants/queue"
import { QUEUE_STATUS_TONE } from "@/shared/constants/status-colors"
import { QueueSummaryPanel } from "@/features/admin/components/admin-logs/queue-summary-panel"

export function TagQueueSummaryPanel() {
  const { data: rows = [], isLoading } = useAdminTagQueueSummary()
  return (
    <QueueSummaryPanel
      title="Tag-event queue"
      icon={TagIcon}
      rows={rows}
      isLoading={isLoading}
      order={TAG_QUEUE_ORDER}
      labels={TAG_QUEUE_STATUS_LABELS}
      tones={QUEUE_STATUS_TONE}
      deadStatus="dead"
    />
  )
}
