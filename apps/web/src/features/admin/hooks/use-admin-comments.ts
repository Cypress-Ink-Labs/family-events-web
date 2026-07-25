import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import {
  deleteAdminComment,
  listAdminComments,
  updateAdminComment,
  type AdminCommentFilter,
} from "@/features/admin/api/comments"
import type { Comment } from "@/shared/types"

export type { AdminComment } from "@/features/admin/types"

export function useAdminComments(page: number, filter: AdminCommentFilter) {
  return useQuery({
    queryKey: [...qk.admin.comments, page, filter],
    queryFn: () => listAdminComments(page, filter),
    placeholderData: keepPreviousData,
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
