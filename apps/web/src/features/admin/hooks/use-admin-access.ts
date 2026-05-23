import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import {
  listAdminUserAccess,
  setAdminUserAccess,
  type SetUserAccessInput,
} from "@/features/admin/api/access"

export function useAdminUserAccess() {
  return useQuery({
    queryKey: qk.admin.userAccess,
    queryFn: listAdminUserAccess,
  })
}

export function useUpdateAdminUserAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetUserAccessInput) => setAdminUserAccess(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.admin.userAccess })
    },
  })
}
