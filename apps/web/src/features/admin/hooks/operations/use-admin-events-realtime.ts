import { useEffect } from "react"
import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/infrastructure/supabase/client"
import { qk } from "@/infrastructure/queries/query-keys"
import type { AdminEventsPageResult } from "@/lib/db/rpc-admin-events"
import type { Event, EventWithDetails } from "@/shared/types"

type AdminEventBroadcastOperation = "INSERT" | "UPDATE" | "DELETE"

interface AdminEventBroadcastChange {
  operation: AdminEventBroadcastOperation
  record: Event | null
  old_record: Event | null
}

interface AdminEventBroadcastPayload {
  payload: AdminEventBroadcastChange
}

type AdminEventsInfiniteCache = InfiniteData<AdminEventsPageResult>

function changedEventId(payload: AdminEventBroadcastPayload): string | null {
  return payload.payload.record?.id ?? payload.payload.old_record?.id ?? null
}

function patchEvent(existing: Event, changed: Event): Event {
  return { ...existing, ...changed }
}

export function patchAdminEventsInfiniteCache(
  data: AdminEventsInfiniteCache | undefined,
  payload: AdminEventBroadcastPayload
): AdminEventsInfiniteCache | undefined {
  if (!data) return data

  const id = changedEventId(payload)
  if (!id) return data

  let changed = false
  const pages = data.pages.map((page) => {
    const existingIndex = page.rows.findIndex((event) => event.id === id)
    if (existingIndex === -1) return page

    if (payload.payload.operation === "DELETE") {
      changed = true
      return {
        ...page,
        rows: page.rows.filter((event) => event.id !== id),
        totalCount: Math.max(0, page.totalCount - 1),
      }
    }

    const record = payload.payload.record
    if (!record) return page

    changed = true
    const rows = [...page.rows]
    rows[existingIndex] = patchEvent(rows[existingIndex], record)
    return { ...page, rows }
  })

  return changed ? { ...data, pages } : data
}

function patchAdminEventDetailCache(
  data: EventWithDetails | null | undefined,
  payload: AdminEventBroadcastPayload
): EventWithDetails | null | undefined {
  if (!data) return data
  const id = changedEventId(payload)
  if (!id || data.id !== id) return data
  if (payload.payload.operation === "DELETE") return null
  const record = payload.payload.record
  return record ? ({ ...data, ...record } as EventWithDetails) : data
}

function patchAdminEventQueries(queryClient: QueryClient, payload: AdminEventBroadcastPayload) {
  const id = changedEventId(payload)
  if (!id) return

  queryClient.setQueriesData<AdminEventsInfiniteCache>({ queryKey: qk.admin.events.all }, (data) =>
    patchAdminEventsInfiniteCache(data, payload)
  )
  queryClient.setQueryData<EventWithDetails | null | undefined>(
    qk.admin.events.detail(id),
    (data) => patchAdminEventDetailCache(data, payload)
  )
}

export function useAdminEventsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let closed = false
    const channel = supabase
      .channel("events:all", { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, (payload) => {
        handleEventChange(payload as unknown as AdminEventBroadcastPayload)
      })
      .on("broadcast", { event: "UPDATE" }, (payload) => {
        handleEventChange(payload as unknown as AdminEventBroadcastPayload)
      })
      .on("broadcast", { event: "DELETE" }, (payload) => {
        handleEventChange(payload as unknown as AdminEventBroadcastPayload)
      })

    function handleEventChange(payload: AdminEventBroadcastPayload) {
      patchAdminEventQueries(queryClient, payload)
      void queryClient.invalidateQueries({ queryKey: qk.admin.stats })
    }

    void supabase.realtime.setAuth().then(() => {
      if (!closed) {
        channel.subscribe()
      }
    })

    return () => {
      closed = true
      void supabase.removeChannel(channel).catch(() => { })
    }
  }, [queryClient])
}
