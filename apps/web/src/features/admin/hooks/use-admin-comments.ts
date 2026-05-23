import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  deleteAdminComment,
  listAdminComments,
  updateAdminComment,
} from "@/features/admin/api/comments"
import type { Comment } from "@/shared/types"

export type { AdminComment } from "@/features/admin/types"

export function useAdminComments() {
  return useQuery({
    queryKey: qk.admin.comments,
    queryFn: listAdminComments,
  })
}

export function useUpdateAdminComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      commentId,
      updates,
    }: {
      commentId: string
      updates: Partial<Pick<Comment, "is_approved" | "is_flagged">>
    }) => updateAdminComment(commentId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.comments })
      void queryClient.invalidateQueries({ queryKey: qk.comments.all })
    },
  })
}

export function useDeleteAdminComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId }: { commentId: string }) => deleteAdminComment(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.comments })
      void queryClient.invalidateQueries({ queryKey: qk.comments.all })
    },
  })
}
