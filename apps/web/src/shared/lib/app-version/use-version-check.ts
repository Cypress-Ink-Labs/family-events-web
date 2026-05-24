import { useEffect } from "react"
import { checkForUpdate } from "./version-check"
import { updateStore } from "./update-store"

const DEFAULT_INTERVAL_MS = 60_000

export function useVersionCheck(intervalMs: number = DEFAULT_INTERVAL_MS) {
  useEffect(() => {
    const currentVersion = __APP_VERSION__

    let cancelled = false

    async function run() {
      if (cancelled) return
      if (typeof document !== "undefined" && document.hidden) return
      if (updateStore.getState().updateAvailable) return
      const result = await checkForUpdate(currentVersion)
      if (cancelled) return
      if (result.stale) {
        updateStore.getState().markUpdateAvailable("poll", result.remoteVersion)
      }
    }

    void run()

    const id = window.setInterval(run, intervalMs)

    function onVisibility() {
      if (!document.hidden) void run()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [intervalMs])
}

export function VersionCheckRunner() {
  useVersionCheck()
  return null
}
