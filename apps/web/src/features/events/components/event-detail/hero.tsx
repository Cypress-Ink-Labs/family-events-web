import { Link } from "react-router-dom"
import { ArrowLeft, Share2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { SmartImage } from "@/shared/components/motion"
import { FavoriteButton } from "@/features/events/components/favorite-button"
import {
  findUnsplashAttribution,
  UnsplashAttribution,
} from "@/features/events/components/unsplash-attribution"
import type { EventWithDetails } from "@/shared/types"

interface EventDetailHeroProps {
  event: EventWithDetails
  imageUrl: string
  isFavorited: boolean
  onFavoriteToggle: (eventId: string, state: boolean) => void
}

export function EventDetailHero({
  event,
  imageUrl,
  isFavorited,
  onFavoriteToggle,
}: EventDetailHeroProps) {
  const attribution = findUnsplashAttribution(event.image_attributions, imageUrl)

  return (
    <>
      <div className="sticky top-14 z-30 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-2">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
          <Link to="/explore">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
      </div>

      <div className="relative">
        <SmartImage
          src={imageUrl}
          alt={event.title}
          className="w-full h-64 sm:h-80 object-cover"
          placeholderClassName="w-full h-64 sm:h-80"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
        <UnsplashAttribution
          attribution={attribution}
          imageUrl={imageUrl}
          className="absolute bottom-3 left-4 right-4 text-white/90 drop-shadow-sm"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <FavoriteButton
            eventId={event.id}
            isFavorited={isFavorited}
            onToggle={onFavoriteToggle}
            variant="overlay"
          />
          <button
            type="button"
            className="size-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
          >
            <Share2 className="size-4 text-foreground" />
          </button>
        </div>
      </div>
    </>
  )
}
