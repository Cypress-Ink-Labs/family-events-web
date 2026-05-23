import { ArrowRight, Sparkles, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/components/ui/carousel"
import { EventCard } from "@/features/events/components/event-card"
import type { EventWithDetails } from "@/shared/types"

interface DashboardCarouselSectionProps {
  title: string
  icon: "featured" | "recommended"
  events: EventWithDetails[]
  eventCardVariant: "featured" | "default"
  isFavorited: (eventId: string) => boolean
  onFavoriteToggle: (eventId: string, newState: boolean) => void
}

export function DashboardCarouselSection({
  title,
  icon,
  events,
  eventCardVariant,
  isFavorited,
  onFavoriteToggle,
}: DashboardCarouselSectionProps) {
  if (events.length === 0) return null
  const Icon = icon === "featured" ? Sparkles : TrendingUp

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          {title}
        </h2>
        <Button variant="ghost" size="sm" className="text-primary gap-1" asChild>
          <Link to="/explore">
            See all <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      <Carousel className="w-full">
        <CarouselContent className="-ml-3">
          {events.map((event) => (
            <CarouselItem key={event.id} className="pl-3 basis-[85%] sm:basis-1/2 lg:basis-1/3">
              <EventCard
                event={{ ...event, is_favorited: isFavorited(event.id) }}
                variant={eventCardVariant}
                onFavoriteToggle={onFavoriteToggle}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </section>
  )
}
