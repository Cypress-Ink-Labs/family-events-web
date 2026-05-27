import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/infrastructure/supabase/client"
import { qk } from "@/infrastructure/queries/query-keys"

export function useAdminEventsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let closed = false
    const channel = supabase
      .channel("events:all", { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, () => {
        invalidateEventQueries()
      })
      .on("broadcast", { event: "UPDATE" }, () => {
        invalidateEventQueries()
      })
      .on("broadcast", { event: "DELETE" }, () => {
        invalidateEventQueries()
      })

    function invalidateEventQueries() {
      void queryClient.invalidateQueries({ queryKey: qk.admin.stats })
      void queryClient.invalidateQueries({ queryKey: qk.admin.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.enrichedEvents.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
    }

    void supabase.realtime.setAuth().then(() => {
      if (!closed) {
        channel.subscribe()
      }
    })

    return () => {
      closed = true
      void supabase.removeChannel(channel).catch(() => {})
    }
  }, [queryClient])
}
