import type { UserNotification } from "@family-events/contracts"
import { supabase } from "@/infrastructure/supabase/client"

/**
 * Fetch notifications for the current user, newest first.
 */
export async function fetchNotifications(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<UserNotification[]> {
  const { limit = 20, offset = 0 } = options

  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, type, title, body, event_id, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`)
  }

  return (data ?? []) as UserNotification[]
}

/**
 * Fetch the count of unread notifications for the current user.
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) {
    throw new Error(`Failed to fetch unread count: ${error.message}`)
  }

  return count ?? 0
}

/**
 * Mark a single notification as read via RPC.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  })

  if (error) {
    throw new Error(`Failed to mark notification read: ${error.message}`)
  }
}

/**
 * Mark all notifications as read for the current user via RPC.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_read")

  if (error) {
    throw new Error(`Failed to mark all notifications read: ${error.message}`)
  }
}
