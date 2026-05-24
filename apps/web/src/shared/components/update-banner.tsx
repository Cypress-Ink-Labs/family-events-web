import { RefreshCcw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/format"
import { updateStore } from "@/shared/lib/app-version/update-store"

function reload() {
  window.location.reload()
}

export function UpdateBanner() {
  const updateAvailable = updateStore((s) => s.updateAvailable)
  const reason = updateStore((s) => s.reason)

  if (!updateAvailable) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-0 z-[60]",
        "border-b border-primary/30 bg-primary/10 backdrop-blur",
        "supports-[backdrop-filter]:bg-primary/15"
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 text-sm">
        <RefreshCcw className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">A new version of this site is available.</p>
          {reason === "chunk-error" && (
            <p className="text-xs text-muted-foreground">
              The page you tried to open is part of the new version.
            </p>
          )}
        </div>
        <Button size="sm" onClick={reload}>
          Update now
        </Button>
      </div>
    </div>
  )
}
