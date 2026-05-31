import { useCallback } from "react"
import { buildShareUrl } from "@family-events/shared"
import { toast } from "sonner"

interface ShareEventOptions {
  eventId: string
  title: string
  description?: string
}

interface UseShareEventReturn {
  share: () => Promise<void>
  /** True when the browser supports the Web Share API (mobile browsers). */
  isNativeShareSupported: boolean
}

/**
 * Share an event via the Web Share API (mobile) or clipboard copy (desktop).
 *
 * The share URL uses `/share/:eventId` which is handled by the share-og
 * edge function to render OG meta tags for rich link previews in iMessage,
 * Slack, etc.
 */
export function useShareEvent({
  eventId,
  title,
  description,
}: ShareEventOptions): UseShareEventReturn {
  const isNativeShareSupported =
    typeof navigator !== "undefined" && typeof navigator.share === "function"

  const share = useCallback(async () => {
    const url = buildShareUrl(window.location.origin, eventId)

    if (isNativeShareSupported) {
      try {
        await navigator.share({
          title,
          text: description ?? title,
          url,
        })
        return
      } catch (error) {
        // User cancelled share sheet — not an error
        if (error instanceof Error && error.name === "AbortError") return
        // Fall through to clipboard on other failures
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied!", { description: "Share it with family and friends." })
    } catch {
      // Clipboard API may be blocked in some contexts
      toast.error("Couldn't copy link. Try copying the URL from your browser.")
    }
  }, [eventId, title, description, isNativeShareSupported])

  return { share, isNativeShareSupported }
}
