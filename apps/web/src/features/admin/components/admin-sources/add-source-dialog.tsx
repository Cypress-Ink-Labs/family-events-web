import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { FormGrid } from "@/components/v2"
import {
  ADMIN_SOURCE_TYPE_OPTIONS,
  type AdminSourceType,
} from "@/features/admin/constants/source-types"
import type { City, EventProcessingMode, ExtractionMode } from "@/shared/types"

export interface SourceDraft {
  name: string
  url: string
  source_type: AdminSourceType
  extraction_mode: ExtractionMode
  processing_mode: EventProcessingMode
  city_id: string
}

interface AddSourceDialogProps {
  open: boolean
  cities: City[]
  newSource: SourceDraft
  onOpenChange: (open: boolean) => void
  onSourceDraftPatch: (patch: Partial<SourceDraft>) => void
  onAddSource: () => void
}

export function AddSourceDialog({
  open,
  cities,
  newSource,
  onOpenChange,
  onSourceDraftPatch,
  onAddSource,
}: AddSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="min-h-[44px] gap-2">
          <Plus className="size-4" />
          <span>Add Source</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Event Source</DialogTitle>
          <DialogDescription>
            Create a source, then trigger a scrape to import events into the review queue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-source-name">Source Name</Label>
            <Input
              id="new-source-name"
              value={newSource.name}
              onChange={(event) => onSourceDraftPatch({ name: event.target.value })}
              placeholder="e.g. NYC Parks Family Events"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-source-url">URL</Label>
            <Input
              id="new-source-url"
              value={newSource.url}
              onChange={(event) => onSourceDraftPatch({ url: event.target.value })}
              placeholder="https://..."
            />
          </div>
          <FormGrid cols={2} gap="3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={newSource.source_type}
                onValueChange={(value) =>
                  onSourceDraftPatch({ source_type: value as AdminSourceType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_SOURCE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Extraction</Label>
              <Select
                value={newSource.extraction_mode}
                onValueChange={(value) =>
                  onSourceDraftPatch({ extraction_mode: value as ExtractionMode })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deterministic">Parser</SelectItem>
                  <SelectItem value="deterministic_then_llm">Parser + LLM</SelectItem>
                  <SelectItem value="llm">LLM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormGrid>
          <FormGrid cols={2} gap="3">
            <div className="space-y-1.5">
              <Label>Processing</Label>
              <Select
                value={newSource.processing_mode}
                onValueChange={(value) =>
                  onSourceDraftPatch({ processing_mode: value as EventProcessingMode })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_review">Manual review</SelectItem>
                  <SelectItem value="auto_approve">Auto approve</SelectItem>
                  <SelectItem value="llm_review">LLM review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Select
                value={newSource.city_id}
                onValueChange={(value) => onSourceDraftPatch({ city_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormGrid>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onAddSource}>Add Source</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
