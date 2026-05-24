import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"

interface AdminAccessDisableDialogProps {
  open: boolean
  disabledReason: string
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onDisabledReasonChange: (value: string) => void
  onConfirm: () => void
}

export function AdminAccessDisableDialog({
  open,
  disabledReason,
  isPending,
  onOpenChange,
  onDisabledReasonChange,
  onConfirm,
}: AdminAccessDisableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable account</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="disable-reason">Reason (optional)</Label>
          <Textarea
            id="disable-reason"
            value={disabledReason}
            onChange={(event) => onDisabledReasonChange(event.target.value)}
            placeholder="Explain why this account is being disabled."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Disabling..." : "Disable account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
