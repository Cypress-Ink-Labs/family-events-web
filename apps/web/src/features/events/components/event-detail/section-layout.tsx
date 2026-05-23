import type { ReactNode } from "react"

export function EventDetailSectionLayout({ children }: { children: ReactNode }) {
  return <div className="px-4 py-6 space-y-6">{children}</div>
}
