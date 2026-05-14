import { toast } from "sonner"
import { useAuth } from "@/features/auth/stores/auth-store"
import { getAdminErrorDetail, humanizeSupabaseError } from "@/lib/humanize-supabase-error"

export function useAdminToast() {
  const { isAdmin } = useAuth()

  return {
    toastError(error: unknown, fallback: string) {
      const message = humanizeSupabaseError(error, fallback)
      if (isAdmin) {
        const detail = getAdminErrorDetail(error)
        toast.error(message, detail ? { description: detail } : undefined)
      } else {
        toast.error(message)
      }
    },
  }
}
