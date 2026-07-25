// @vitest-environment jsdom

import { fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { qk } from "@/infrastructure/queries/query-keys"
import { AdminAccessPage } from "./admin-access"

const mocks = vi.hoisted(() => ({
  clearSelectedIds: vi.fn(),
  deleteAdminUser: vi.fn(),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}))

vi.mock("@/features/admin/api/access", () => ({
  deleteAdminUser: mocks.deleteAdminUser,
}))

vi.mock("@/features/admin/components/admin-access-sections", () => ({
  AdminAccessBulkBar: ({ onDelete }: { onDelete: () => void }) => (
    <button onClick={onDelete}>Delete selected</button>
  ),
  AdminAccessDeleteDialog: () => null,
  AdminAccessDisableDialog: () => null,
  AdminAccessHeader: () => null,
  AdminAccessList: () => null,
}))

vi.mock("@/features/admin/hooks/use-admin-access", () => ({
  useAdminUserAccess: () => ({
    data: Array.from({ length: 10 }, (_, index) => ({
      user_id: `user-${index}`,
      email: `user-${index}@example.com`,
    })),
  }),
  useDeleteAdminUser: () => ({ mutateAsync: vi.fn() }),
  useUpdateAdminUserAccess: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("@/features/admin/hooks/use-admin-toast", () => ({
  useAdminToast: () => ({ toastError: vi.fn() }),
}))

vi.mock("@/features/admin/stores/admin-store", () => ({
  useAdminStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      accessQuery: "",
      clearSelectedIds: mocks.clearSelectedIds,
      selectedIds: new Set(Array.from({ length: 10 }, (_, index) => `user-${index}`)),
      setAccessQuery: vi.fn(),
      setSelectedIds: vi.fn(),
      toggleSelectedId: vi.fn(),
    }),
}))

vi.mock("@/features/auth/stores/auth-store", () => ({
  useAuth: () => ({ refreshProfile: vi.fn(), user: null }),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

afterEach(() => {
  mocks.clearSelectedIds.mockReset()
  mocks.deleteAdminUser.mockReset()
  mocks.invalidateQueries.mockClear()
  vi.restoreAllMocks()
})

describe("AdminAccessPage bulk deletion", () => {
  it("limits ten direct deletions to four in flight and invalidates access once", async () => {
    const deletions = new Map(
      Array.from({ length: 10 }, (_, index) => [`user-${index}`, deferred()])
    )
    let inFlight = 0
    let maxInFlight = 0

    mocks.deleteAdminUser.mockImplementation((userId: string) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      const deletion = deletions.get(userId)
      if (!deletion) {
        throw new Error(`Unexpected user ${userId}`)
      }

      return deletion.promise.finally(() => {
        inFlight -= 1
      })
    })
    vi.spyOn(window, "confirm").mockReturnValue(true)

    const { getByRole } = render(<AdminAccessPage />)
    fireEvent.click(getByRole("button", { name: "Delete selected" }))

    await waitFor(() => expect(mocks.deleteAdminUser).toHaveBeenCalledTimes(4))
    expect(maxInFlight).toBe(4)

    for (const deletion of deletions.values()) {
      deletion.resolve()
      await Promise.resolve()
    }

    await waitFor(() =>
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: qk.admin.userAccess })
    )
    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(1)
    expect(maxInFlight).toBe(4)
    expect(mocks.clearSelectedIds).toHaveBeenCalledOnce()
  })
})
