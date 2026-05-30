import { TriangleAlert as AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  useAdminDeadTagQueueRows,
  useAdminRetryTagQueue,
  useDeleteDeadTagQueueRow,
} from "@/features/admin/hooks/operations/use-admin-tag-queue"
import {
  useAdminDeadSourceQueueRows,
  useAdminRetrySourceQueue,
  useDeleteDeadSourceQueueRow,
} from "@/features/admin/hooks/sources/use-admin-source-queue"
import { DeadLetterSection } from "@/features/admin/components/admin-logs/dead-letter-section"

export function DeadLettersPanel() {
  const { data: sourceRows = [] } = useAdminDeadSourceQueueRows()
  const { data: tagRows = [] } = useAdminDeadTagQueueRows()
  const retrySource = useAdminRetrySourceQueue()
  const retryTag = useAdminRetryTagQueue()
  const deleteSource = useDeleteDeadSourceQueueRow()
  const deleteTag = useDeleteDeadTagQueueRow()
  const hasRows = sourceRows.length > 0 || tagRows.length > 0

  if (!hasRows) return null

  return (
    <Card className="border-destructive/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-sm font-semibold text-foreground">Dead letters</h2>
        </div>
        <DeadLetterSection
          heading="Sources"
          rows={sourceRows}
          keyPrefix="source"
          retryPending={retrySource.isPending}
          deletePending={deleteSource.isPending}
          titleForRow={(row) => row.event_sources?.name ?? row.source_id ?? "Unknown source"}
          retryIdForRow={(row) => row.id}
          onRetry={(queueId) => retrySource.mutate(queueId)}
          onDelete={(queueId) => deleteSource.mutate(queueId)}
        />
        <DeadLetterSection
          heading="Tags"
          rows={tagRows}
          keyPrefix="tag"
          retryPending={retryTag.isPending}
          deletePending={deleteTag.isPending}
          titleForRow={(row) => row.events?.title ?? row.event_id}
          retryIdForRow={(row) => row.id}
          onRetry={(queueId) => retryTag.mutate(queueId)}
          onDelete={(queueId) => deleteTag.mutate(queueId)}
        />
      </CardContent>
    </Card>
  )
}
