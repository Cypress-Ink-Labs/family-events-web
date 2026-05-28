import { format } from "date-fns"
import { cleanDescription } from "@family-events/shared"
import { AgeRangeBadge, TagBadge } from "@/features/events/components/tag-badge"
import type { EventWithDetails } from "@/shared/types"

interface EventDetailSummaryProps {
  event: EventWithDetails
  startDate: Date
}

export function EventDetailSummary({ event, startDate }: EventDetailSummaryProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          {format(startDate, "EEEE MMMM d · h:mm a")}
        </span>
      </div>
      <h1 className="text-2xl font-semibold text-foreground tracking-tight">{event.title}</h1>
      <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
        {(cleanDescription(event.description) ?? "").slice(0, 100)}
      </p>

      <div className="flex flex-wrap gap-2 mt-3">
        <AgeRangeBadge ageMin={event.age_min} ageMax={event.age_max} />
        {event.tags?.slice(0, 3).map((tag) => (
          <TagBadge key={tag.tag_id} tag={tag.tag} />
        ))}
      </div>
    </div>
  )
}
