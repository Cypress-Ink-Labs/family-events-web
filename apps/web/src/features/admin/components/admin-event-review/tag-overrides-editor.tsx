import { Button } from "@/components/ui/button"
import { TagBadge } from "@/features/events/components/tag-badge"
import { cn } from "@/lib/utils"
import type { EventWithDetails, Tag as EventTag } from "@/lib/types"

interface TagOverridesEditorProps {
  event: EventWithDetails
  allTags: EventTag[]
  editingTagIds: string[]
  onToggleTag: (tagId: string) => void
  onSaveTags: () => void
}

export function TagOverridesEditor({
  event,
  allTags,
  editingTagIds,
  onToggleTag,
  onSaveTags,
}: TagOverridesEditorProps) {
  return (
    <div>
      <p className="text-sm font-semibold mb-2">Tags</p>
      <div className="flex flex-wrap gap-1.5">
        {event.tags?.map((tag) => (
          <TagBadge key={tag.tag_id} tag={tag.tag} />
        ))}
        {allTags.map((tag) => (
          <button
            type="button"
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-colors",
              editingTagIds.includes(tag.id)
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
            )}
          >
            {editingTagIds.includes(tag.id) ? "✓" : "+"} {tag.name}
          </button>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-2" onClick={onSaveTags}>
        Save Tag Overrides
      </Button>
    </div>
  )
}
