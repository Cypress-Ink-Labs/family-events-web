import { supabase } from "@/infrastructure/supabase/client"
import type { Tag } from "@/lib/types"

const TAG_COLUMNS = "id, name, slug, color, category, is_system, created_at"

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select(TAG_COLUMNS)
    .order("category", { ascending: true })
    .order("name", { ascending: true })
  if (error) throw error
  return data ?? []
}
