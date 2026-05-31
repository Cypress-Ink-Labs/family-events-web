import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/infrastructure/supabase/client"

export interface SimilarEvent {
  event_id: string
  title: string
  cosine_distance: number
  city_id: string | null
  source_id: string | null
}

async function fetchSimilarEvents(
  eventId: string,
  limit: number,
  cityId?: string
): Promise<SimilarEvent[]> {
  const { data, error } = await supabase.rpc("find_similar_events_by_id", {
    p_event_id: eventId,
    p_limit: limit,
    p_city_id: cityId ?? undefined,
  })
  if (error) throw error
  return (data ?? []) as SimilarEvent[]
}

/**
 * Fetches similar events for a given event via the find_similar_events_by_id RPC.
 * Returns 3-5 similar published events based on embedding cosine distance.
 */
export function useSimilarEvents(eventId: string | undefined, cityId?: string) {
  return useQuery({
    queryKey: ["similar-events", eventId ?? null, cityId ?? null],
    queryFn: () => fetchSimilarEvents(eventId!, 5, cityId),
    enabled: Boolean(eventId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
