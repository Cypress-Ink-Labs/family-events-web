import { useCallback } from "react"
import type { VirtualItem } from "@tanstack/react-virtual"

interface AdminEventsListLoaderRowProps {
  virtualRow: VirtualItem
  measureElement: (element: Element | null) => void
  isFetchingNextPage: boolean
  onFetchNextPage: () => void
}

export function AdminEventsListLoaderRow({
  virtualRow,
  measureElement,
  isFetchingNextPage,
  onFetchNextPage,
}: AdminEventsListLoaderRowProps) {
  const triggerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        measureElement(node)
        if (!isFetchingNextPage) {
          onFetchNextPage()
        }
      }
    },
    [measureElement, isFetchingNextPage, onFetchNextPage]
  )

  return (
    <div
      key="admin-events-loader-row"
      ref={triggerRef}
      data-index={virtualRow.index}
      className="w-full"
      style={{
        transform: `translateY(${virtualRow.start}px)`,
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        paddingBottom: "0.75rem",
      }}
    >
      <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
        {isFetchingNextPage ? "Loading next events..." : "Load more events available."}
      </div>
    </div>
  )
}
