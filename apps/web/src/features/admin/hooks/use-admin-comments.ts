import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { supabase } from "@/lib/supabase/client"
import type { Comment } from "@/lib/types"
import type { AdminComment } from "@/features/admin/types"

export type { AdminComment } from "@/features/admin/types"

export function useAdminComments() {
  return useQuery({
    queryKey: qk.admin.comments,
    queryFn: async (): Promise<AdminComment[]> => {
      const { data, error } = await supabase
        .from("comments")
        .select(
          "id, user_id, event_id, body, is_approved, is_flagged, created_at, updated_at, user_profiles(display_name), events(title)"
        )
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []) as AdminComment[]
    },
  })
}

export function useUpdateAdminComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      commentId,
      updates,
    }: {
      commentId: string
      updates: Partial<Pick<Comment, "is_approved" | "is_flagged">>
    }) => {
      const { error } = await supabase.from("comments").update(updates).eq("id", commentId)
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.comments })
      void queryClient.invalidateQueries({ queryKey: qk.comments.all })
    },
  })
}

export function useDeleteAdminComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string }) => {
      const { error } = await supabase.from("comments").delete().eq("id", commentId)
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.comments })
      void queryClient.invalidateQueries({ queryKey: qk.comments.all })
    },
  })
}
