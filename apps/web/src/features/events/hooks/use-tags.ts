import { useQuery } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { listTags } from "@/features/events/api/tags"


export function useTags() {
  return useQuery({
    queryKey: qk.tags.all,
    queryFn: listTags,
  })
}
