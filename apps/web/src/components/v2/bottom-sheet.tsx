import type { ReactNode } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { useIsMobile } from "@/shared/hooks/use-mobile"

type BottomSheetProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  variant?: "auto" | "sheet" | "dialog"
  className?: string
}

/**
 * iOS-style bottom sheet on mobile, centered Dialog on md+.
 *
 * Picks Sheet (bottom anchor) at <md and Dialog at md+. Wrap the same
 * children in both to avoid duplicating mount semantics. Variant="sheet"
 * or "dialog" forces a side. Default "auto" follows breakpoint.
 */
function BottomSheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  variant = "auto",
  className,
}: BottomSheetProps) {
  const isMobile = useIsMobile()
  const useSheet = variant === "sheet" || (variant === "auto" && isMobile)

  if (useSheet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
        <SheetContent side="bottom" className={className}>
          {title || description ? (
            <SheetHeader>
              {title ? <SheetTitle>{title}</SheetTitle> : null}
              {description ? <SheetDescription>{description}</SheetDescription> : null}
            </SheetHeader>
          ) : null}
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={className}>
        {title || description ? (
          <DialogHeader>
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        ) : null}
        {children}
      </DialogContent>
    </Dialog>
  )
}
