import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

/**
 * Bridges a Supabase realtime registry (from `lib/realtime/channel-registry`)
 * to TanStack Query: subscribes for the lifetime of the component and
 * invalidates the supplied query key whenever the channel fires.
 *
 * Use this when a screen wants "the cache should refetch whenever this DB
 * subject changes" without rolling its own useEffect + subscribe boilerplate.
 *
 * @param subscribeFn Function that subscribes a listener for a given key and
 *                    returns the unsubscribe handle. Typically a registry's
 *                    `subscribe(key, listener)` method.
 * @param key         The subject key for the subscription (event id, source
 *                    id, etc.). Subscription resets when this changes.
 * @param queryKey    TanStack Query key to invalidate on every change event.
 */
export function useRealtimeInvalidation<Key extends string>(
  subscribeFn: (key: Key, listener: () => void) => () => void,
  key: Key | undefined,
  queryKey: readonly unknown[]
): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!key) return
    return subscribeFn(key, () => {
      void queryClient.invalidateQueries({ queryKey })
    })
    // queryKey is a stable readonly tuple per call site (built via `qk.*`); intentionally not serialized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeFn, key, queryClient])
}
