import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase/client"
import type { Tag } from "@/lib/types"

export const TAGS_QUERY_KEY = qk.tags.all

async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, slug, color, category, is_system, created_at")
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export function useTags() {
  return useQuery({
    queryKey: qk.tags.all,
    queryFn: fetchTags,
  })
}
