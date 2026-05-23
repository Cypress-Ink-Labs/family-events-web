import { AlertCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormGrid, Toolbar } from "@/components/v2"
import type { InviteCode } from "@/lib/types"

export type ExpiryOption = "7d" | "30d" | "never"

interface AdminInvitesHeaderProps {
  codes: InviteCode[]
  dialogOpen: boolean
  newCode: {
    max_uses: number
    expires: ExpiryOption
    notes: string
  }
  isCreating: boolean
  onDialogOpenChange: (open: boolean) => void
  onMaxUsesChange: (value: string) => void
  onExpiryChange: (value: ExpiryOption) => void
  onNotesChange: (value: string) => void
  onCreate: () => void
}

export function AdminInvitesHeader({
  codes,
  dialogOpen,
  newCode,
  isCreating,
  onDialogOpenChange,
  onMaxUsesChange,
  onExpiryChange,
  onNotesChange,
  onCreate,
}: AdminInvitesHeaderProps) {
  const totalUses = codes.reduce((sum, code) => sum + code.used_count, 0)
  return (
    <Toolbar
      title="Invite Codes"
      subtitle={`${codes.length} code${codes.length === 1 ? "" : "s"} · ${totalUses} total uses`}
      actions={
        <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px] gap-2">
              <Plus className="size-4" /> New Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate invite code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-100">
                <div className="flex gap-2">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <div>
                    Codes are generated server-side and shown <strong>once</strong>. The plaintext
                    is hashed before storage; there is no way to recover it afterward, so copy it
                    immediately.
                  </div>
                </div>
              </div>
              <FormGrid cols={2} gap="3">
                <div className="space-y-1.5">
                  <Label>Max uses</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newCode.max_uses}
                    onChange={(event) => onMaxUsesChange(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expires in</Label>
                  <Select
                    value={newCode.expires}
                    onValueChange={(value) => onExpiryChange(value as ExpiryOption)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FormGrid>
              <div className="space-y-1.5">
                <Label>Notes (who&apos;s this for?)</Label>
                <Input
                  value={newCode.notes}
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="e.g. Friends & family batch"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  )
}
