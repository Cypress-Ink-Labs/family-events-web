import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase/client"
import type { AdminRating } from "@/features/admin/types"

export function useAdminRatings() {
  return useQuery({
    queryKey: qk.admin.ratings,
    queryFn: async (): Promise<AdminRating[]> => {
      const { data, error } = await supabase
        .from("ratings")
        .select(
          "id, user_id, event_id, score, created_at, user_profiles(display_name), events(title)"
        )
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as AdminRating[]
    },
  })
}

export function useDeleteAdminRating() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ratingId }: { ratingId: string }) => {
      const { error } = await supabase.from("ratings").delete().eq("id", ratingId)
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.ratings })
      void queryClient.invalidateQueries({ queryKey: qk.ratings.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
    },
  })
}
