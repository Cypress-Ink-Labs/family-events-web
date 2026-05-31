import { Bell } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { useAuth } from "@/features/auth/stores/auth-store"
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/features/notifications/hooks/use-notifications"
import { NotificationList } from "./notification-list"

/**
 * Bell icon with unread count badge. Shows notification dropdown on click.
 * Only renders for authenticated users.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const userId = user?.id

  const { data: unreadCount = 0 } = useUnreadCount(userId)
  const { data: notifications = [] } = useNotifications(userId, 20)
  const markRead = useMarkRead(userId)
  const markAllRead = useMarkAllRead(userId)

  if (!userId) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-10 min-h-[44px] w-10 p-0"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <NotificationList
          notifications={notifications}
          onMarkRead={(id) => markRead.mutate(id)}
          onMarkAllRead={() => markAllRead.mutate()}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
