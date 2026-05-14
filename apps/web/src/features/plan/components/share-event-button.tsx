import { useMemo, useState } from "react"
import { Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface ShareEventButtonProps {
  eventId: string
  eventTitle: string
}

export function ShareEventButton({ eventId, eventTitle }: ShareEventButtonProps) {
  const [manualOpen, setManualOpen] = useState(false)
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/share/${encodeURIComponent(eventId)}`
    }
    return `${window.location.origin}/share/${encodeURIComponent(eventId)}`
  }, [eventId])

  async function copyToClipboard(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return false
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      return true
    } catch {
      return false
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Family plan: ${eventTitle}`,
          url: shareUrl,
        })
        toast.success("Shared")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
      }
    }

    if (await copyToClipboard()) {
      toast.success("Link copied")
      return
    }

    setManualOpen(true)
  }

  async function handleManualCopy() {
    if (await copyToClipboard()) {
      toast.success("Link copied")
      setManualOpen(false)
      return
    }

    toast("Copy this link manually")
  }

  return (
    <>
      <Button onClick={handleShare} className="gap-2">
        <Share2 className="size-4" />
        Share plan
      </Button>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share this plan</DialogTitle>
            <DialogDescription>
              Your browser cannot share or copy automatically. Copy this link and send it.
            </DialogDescription>
          </DialogHeader>
          <Input value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Close
            </Button>
            <Button onClick={handleManualCopy} className="gap-2">
              <Copy className="size-4" />
              Copy link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
