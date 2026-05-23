import { useState } from "react"
import { Heart } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { humanizeSupabaseError } from "@/lib/supabase/errors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/stores/auth-store"
import { useToggleFavorite } from "@/features/events/hooks/use-favorites"
import { toast } from "sonner"

interface FavoriteButtonProps {
  eventId: string
  isFavorited: boolean
  onToggle?: (eventId: string, newState: boolean) => void
  size?: "sm" | "md"
  className?: string
  variant?: "overlay" | "inline"
}

const heartSpring = { type: "spring", stiffness: 480, damping: 18 } as const

export function FavoriteButton({
  eventId,
  isFavorited,
  onToggle,
  size = "md",
  className,
  variant = "inline",
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const toggleFavorite = useToggleFavorite(user?.id)
  const [optimisticState, setOptimisticState] = useState<{
    eventId: string
    base: boolean
    value: boolean | null
  } | null>(null)
  // Only burst on a real user toggle, not on mount or external prop sync.
  const [burstSeed, setBurstSeed] = useState<number | null>(null)
  const optimisticOverride =
    optimisticState?.eventId === eventId && optimisticState.base === isFavorited
      ? optimisticState.value
      : null
  const optimistic = optimisticOverride ?? isFavorited

  function setOptimisticOverride(value: boolean | null) {
    setOptimisticState({ eventId, base: isFavorited, value })
  }

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      toast("Sign in to save events", {
        description: "Create a free account to save your favorites.",
      })
      return
    }

    const currentState = optimistic
    const nextState = !currentState

    setOptimisticOverride(nextState)
    onToggle?.(eventId, nextState)
    if (nextState) {
      setBurstSeed(Date.now())
    }

    try {
      const persistedState = await toggleFavorite.mutateAsync({
        eventId,
        isFavorited: currentState,
      })

      setOptimisticOverride(persistedState)
      onToggle?.(eventId, persistedState)

      if (persistedState) {
        toast.success("Event saved!", { description: "Added to your favorites." })
      } else {
        toast("Removed from favorites")
      }
    } catch (error) {
      setOptimisticOverride(currentState)
      onToggle?.(eventId, currentState)
      toast.error(humanizeSupabaseError(error, "Failed to update favorite."))
    }
  }

  const HeartIcon = (
    <m.span
      key={optimistic ? "filled" : "outline"}
      initial={{ scale: 0.7 }}
      animate={{ scale: 1 }}
      transition={heartSpring}
      className="relative inline-flex"
    >
      <Heart
        className={cn(
          "transition-colors",
          variant === "overlay" ? (size === "sm" ? "size-3.5" : "size-4.5") : "size-4",
          optimistic
            ? "fill-destructive stroke-destructive"
            : variant === "overlay"
              ? "stroke-muted-foreground"
              : "stroke-current"
        )}
      />
      <AnimatePresence initial={false}>
        {burstSeed !== null && optimistic && (
          <m.span
            key={burstSeed}
            aria-hidden="true"
            initial={{ opacity: 0.5, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setBurstSeed(null)}
            className="pointer-events-none absolute inset-0 rounded-full bg-destructive/40"
          />
        )}
      </AnimatePresence>
    </m.span>
  )

  if (variant === "overlay") {
    return (
      <m.button
        type="button"
        onClick={handleToggle}
        disabled={toggleFavorite.isPending}
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.08 }}
        transition={heartSpring}
        className={cn(
          "absolute top-3 right-3 z-10 flex items-center justify-center rounded-full",
          "bg-white/90 backdrop-blur-sm shadow-md",
          size === "sm" ? "size-7" : "size-9",
          className
        )}
        aria-label={optimistic ? "Remove from favorites" : "Add to favorites"}
      >
        {HeartIcon}
      </m.button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={toggleFavorite.isPending}
      className={cn("gap-1.5", className)}
      aria-label={optimistic ? "Remove from favorites" : "Add to favorites"}
    >
      {HeartIcon}
    </Button>
  )
}
