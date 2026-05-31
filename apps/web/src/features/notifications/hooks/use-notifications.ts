import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api/notifications-api"
import { subscribeToNotificationChanges } from "@/features/notifications/lib/notifications-channel-registry"

/**
 * Fetch the current user's notifications with pagination.
 */
export function useNotifications(userId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: qk.notifications.byUser(userId),
    queryFn: () => {
      if (!userId) return []
      return fetchNotifications(userId, { limit })
    },
    enabled: Boolean(userId),
  })
}

/**
 * Fetch the current user's unread notification count.
 * Automatically invalidated by realtime subscription.
 */
export function useUnreadCount(userId: string | undefined) {
  const queryClient = useQueryClient()

  // Subscribe to realtime changes and invalidate count on any change
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToNotificationChanges(userId, () => {
      void queryClient.invalidateQueries({
        queryKey: qk.notifications.unreadCount(userId),
      })
      void queryClient.invalidateQueries({
        queryKey: qk.notifications.byUser(userId),
      })
    })

    return unsubscribe
  }, [userId, queryClient])

  return useQuery({
    queryKey: qk.notifications.unreadCount(userId),
    queryFn: () => {
      if (!userId) return 0
      return fetchUnreadCount(userId)
    },
    enabled: Boolean(userId),
    // Poll every 60s as a fallback in case realtime drops
    refetchInterval: 60_000,
  })
}

/**
 * Mark a single notification as read.
 */
export function useMarkRead(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications.byUser(userId) })
      void queryClient.invalidateQueries({ queryKey: qk.notifications.unreadCount(userId) })
    },
  })
}

/**
 * Mark all notifications as read.
 */
export function useMarkAllRead(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications.byUser(userId) })
      void queryClient.invalidateQueries({ queryKey: qk.notifications.unreadCount(userId) })
    },
  })
}
