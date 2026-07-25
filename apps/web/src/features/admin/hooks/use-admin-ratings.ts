import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { deleteAdminRating, listAdminRatings } from "@/features/admin/api/ratings"

export function useAdminRatings(page: number) {
  return useQuery({
    queryKey: [...qk.admin.ratings, page],
    queryFn: () => listAdminRatings(page),
    placeholderData: keepPreviousData,
  })
}

export function useDeleteAdminRating() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ratingId }: { ratingId: string }) => deleteAdminRating(ratingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.ratings })
      void queryClient.invalidateQueries({ queryKey: qk.ratings.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.all })
      void queryClient.invalidateQueries({ queryKey: qk.events.detailAll })
    },
  })
}
