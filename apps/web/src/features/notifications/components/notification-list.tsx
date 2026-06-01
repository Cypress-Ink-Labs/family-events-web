import type { UserNotification } from "@family-events/contracts"
import { Link } from "react-router"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/format"

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return "just now"

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(dateString).toLocaleDateString()
}

interface NotificationListProps {
  notifications: UserNotification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

export function NotificationList({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        No notifications yet
      </div>
    )
  }

  const hasUnread = notifications.some((n) => !n.read_at)

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <span className="text-sm font-medium">Notifications</span>
        {hasUnread ? (
          <Button
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onMarkAllRead()
            }}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.map((notification) => {
          const isUnread = !notification.read_at
          const content = (
            <div
              className={cn(
                "flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                isUnread && "bg-primary/5"
              )}
            >
              {/* Unread dot */}
              <div className="flex shrink-0 items-start pt-1.5">
                <span
                  className={cn(
                    "block size-2 rounded-full",
                    isUnread ? "bg-primary" : "bg-transparent"
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{notification.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {notification.body}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {formatRelativeTime(notification.created_at)}
                </p>
              </div>
            </div>
          )

          const handleClick = () => {
            if (isUnread) {
              onMarkRead(notification.id)
            }
          }

          if (notification.event_id) {
            return (
              <Link
                key={notification.id}
                to={`/events/${notification.event_id}`}
                onClick={handleClick}
                className="block"
              >
                {content}
              </Link>
            )
          }

          return (
            <Button
              key={notification.id}
              variant="ghost"
              className="h-auto w-full justify-start rounded-none p-0 font-normal"
              onClick={handleClick}
            >
              {content}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
