import { useCallback, useSyncExternalStore } from "react"

let nowMs = Date.now()

function getSnapshot() {
  return nowMs
}

function getServerSnapshot() {
  return null
}

export function useNowMs(intervalMs = 1000) {
  const subscribe = useCallback(
    (listener: () => void) => {
      const id = window.setInterval(() => {
        nowMs = Date.now()
        listener()
      }, intervalMs)
      return () => window.clearInterval(id)
    },
    [intervalMs]
  )
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
