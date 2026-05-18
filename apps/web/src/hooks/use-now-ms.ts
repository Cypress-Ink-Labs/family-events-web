import { useSyncExternalStore } from "react"

let nowMs = Date.now()

function getSnapshot() {
  return nowMs
}

function getServerSnapshot() {
  return null
}

export function useNowMs(intervalMs = 1000) {
  return useSyncExternalStore(
    (listener) => {
      nowMs = Date.now()
      const id = window.setInterval(() => {
        nowMs = Date.now()
        listener()
      }, intervalMs)
      return () => window.clearInterval(id)
    },
    getSnapshot,
    getServerSnapshot
  )
}
