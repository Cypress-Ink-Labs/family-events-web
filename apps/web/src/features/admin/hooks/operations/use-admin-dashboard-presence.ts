import { useEffect, useMemo, useState } from "react"
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
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const [users, setUsers] = useState<AdminDashboardPresenceUser[]>([])

  const payload = useMemo<DashboardPresencePayload | null>(() => {
    if (!user) return null
    return {
      user_id: user.id,
      display_name: profile?.display_name || user.email || "Admin",
      online_at: new Date().toISOString(),
    }
  }, [profile?.display_name, user])

  useEffect(() => {
    if (!user || !payload) {
      setUsers([])
      return
    }

    let closed = false
    const channel = supabase.channel("dashboard:events", {
      config: {
        private: true,
        presence: { key: user.id },
      },
    })

    function syncPresence() {
      setUsers(toPresenceUsers(channel.presenceState() as PresenceState))
    }

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)

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
  }, [payload, user])

  return users
}
