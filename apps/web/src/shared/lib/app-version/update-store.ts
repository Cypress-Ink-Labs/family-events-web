import { create } from "zustand"
import { devtools } from "zustand/middleware"

export type UpdateReason = "poll" | "chunk-error"

interface UpdateStore {
  updateAvailable: boolean
  reason: UpdateReason | null
  remoteVersion: string | null
  markUpdateAvailable: (reason: UpdateReason, remoteVersion?: string | null) => void
  dismiss: () => void
}

export const updateStore = create<UpdateStore>()(
  devtools(
    (set, get) => ({
      updateAvailable: false,
      reason: null,
      remoteVersion: null,
      markUpdateAvailable: (reason, remoteVersion = null) => {
        // A chunk-error trumps a poll signal (more urgent — user already broken).
        const current = get()
        if (current.updateAvailable && current.reason === "chunk-error" && reason === "poll") {
          return
        }
        set({ updateAvailable: true, reason, remoteVersion })
      },
      dismiss: () => set({ updateAvailable: false, reason: null, remoteVersion: null }),
    }),
    { name: "app-update" }
  )
)

export function useUpdateAvailable() {
  return updateStore((s) => s.updateAvailable)
}

export function useUpdateReason() {
  return updateStore((s) => s.reason)
}
