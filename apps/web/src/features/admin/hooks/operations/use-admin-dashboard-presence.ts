import { useEffect, useState } from "react"
import { supabase } from "@/infrastructure/supabase/client"
import { useAuthStore } from "@/features/auth/stores/auth-store"

export interface AdminDashboardPresenceUser {
  userId: string
  name: string
}

interface DashboardPresencePayload {
  user_id: string
  display_name: string
  online_at: string
}

type PresenceState = Record<string, DashboardPresencePayload[]>

function toPresenceUsers(state: PresenceState): AdminDashboardPresenceUser[] {
  const users = new Map<string, AdminDashboardPresenceUser>()
  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      users.set(presence.user_id, {
        userId: presence.user_id,
        name: presence.display_name,
      })
    }
  }
  return [...users.values()].toSorted((a, b) => a.name.localeCompare(b.name))
}

export function useAdminDashboardPresence() {
  // Select primitives only — Supabase recreates the user object on token refresh,
  // so depending on the full object would re-subscribe every ~55 minutes.
  const userId = useAuthStore((state) => state.user?.id)
  const displayName = useAuthStore(
    (state) => state.profile?.display_name || state.user?.email || "Admin"
  )
  const [users, setUsers] = useState<AdminDashboardPresenceUser[]>([])

  useEffect(() => {
    if (!userId) {
      setUsers([])
      return
    }

    let closed = false
    const channel = supabase.channel("dashboard:events", {
      config: {
        private: true,
        presence: { key: userId },
      },
    })

    function syncPresence() {
      setUsers(toPresenceUsers(channel.presenceState() as PresenceState))
    }

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)

    // online_at is set at track time, not at payload construction time.
    const payload: DashboardPresencePayload = {
      user_id: userId,
      display_name: displayName,
      online_at: new Date().toISOString(),
    }

    void supabase.realtime.setAuth().then(() => {
      if (closed) return
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track(payload)
        }
      })
    })

    return () => {
      closed = true
      setUsers([])
      void channel.untrack().catch(() => {})
      void supabase.removeChannel(channel).catch(() => {})
    }
  }, [userId, displayName])

  return users
}
