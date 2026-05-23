import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ClientDistanceToNow } from "@/components/client-date"

export interface DeadLetterBaseRow {
  id: number
  attempt_count: number
  finished_at: string | null
  last_error: string | null
}

interface DeadLetterSectionProps<Row extends DeadLetterBaseRow, RetryId extends string | number> {
  heading: string
  rows: Row[]
  keyPrefix: string
  retryPending: boolean
  deletePending: boolean
  titleForRow: (row: Row) => string
  retryIdForRow: (row: Row) => RetryId
  onRetry: (id: RetryId) => void
  onDelete: (id: number) => void
}

export function DeadLetterSection<Row extends DeadLetterBaseRow, RetryId extends string | number>({
  heading,
  rows,
  keyPrefix,
  retryPending,
  deletePending,
  titleForRow,
  retryIdForRow,
  onRetry,
  onDelete,
}: DeadLetterSectionProps<Row, RetryId>) {
  if (rows.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">{heading}</h3>
      {rows.map((row) => (
        <div
          key={`${keyPrefix}-${row.id}`}
          className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">{titleForRow(row)}</div>
            <div className="text-xs text-muted-foreground">
              {row.attempt_count} attempts
              {row.finished_at ? (
                <>
                  {" "}
                  · <ClientDistanceToNow value={row.finished_at} addSuffix />
                </>
              ) : null}
            </div>
            {row.last_error && (
              <p className="line-clamp-2 font-mono text-xs text-destructive">{row.last_error}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 self-end sm:self-start">
            <Button
              size="sm"
              variant="outline"
              disabled={retryPending}
              onClick={() => onRetry(retryIdForRow(row))}
            >
              Retry
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0 text-muted-foreground hover:text-destructive"
                  disabled={deletePending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This dead-letter row will be permanently removed and cannot be recovered.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(row.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  )
}
