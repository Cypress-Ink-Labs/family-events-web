import { useMutation, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/infrastructure/queries/query-keys"
import { supabase } from "@/infrastructure/supabase/client"
import type { UserProfile } from "@/lib/types"

interface UpdateProfileInput {
  display_name?: string | null
  child_name?: string | null
  child_age?: number | null
  city_preference_id?: string | null
}

export function useUpdateProfile(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateProfileInput) => {
      if (!userId) {
        throw new Error("You must be signed in to update your profile.")
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .update(payload)
        .eq("id", userId)
        .select(
          "id, email, display_name, avatar_url, role, city_preference_id, child_name, child_age, created_at, updated_at"
        )
        .single()

      if (error) {
        throw error
      }

      return data as UserProfile
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.userProfile.byUser(userId) })
    },
  })
}
