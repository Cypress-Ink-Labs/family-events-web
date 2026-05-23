import { useEffect, useState } from "react"

export function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return <span className="tabular-nums">{mins > 0 ? `${mins}m ${secs}s` : `${secs}s`} elapsed</span>
}
