import { Badge } from "@/components/ui/badge"
import { ClientDate } from "@/components/client-date"
import { AdminEventEditSection } from "@/features/admin/components/admin-event-edit-sections"
import type { EventWithDetails } from "@/shared/types"

export function AdminEventAuditSummary({ event }: { event: EventWithDetails }) {
  return (
    <AdminEventEditSection title="Audit summary">
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">{event.admin_locked_fields.length} locked fields</Badge>
        <Badge variant="outline">
          Last edited:{" "}
          {event.admin_last_edited_at ? (
            <ClientDate value={event.admin_last_edited_at} pattern="Pp" />
          ) : (
            "Never"
          )}
        </Badge>
        {event.admin_last_edited_by ? (
          <Badge variant="outline">Editor: {event.admin_last_edited_by}</Badge>
        ) : null}
      </div>
    </AdminEventEditSection>
  )
}
