import { Link } from "react-router-dom"
import { format } from "date-fns"
import { MapPin, Clock, Lightbulb, Calendar, Sparkles, TrendingUp, ArrowRight } from "lucide-react"
import { safeImageSrc } from "@/lib/safe-url"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EventCard, EventCardSkeleton } from "@/features/events/components/event-card"
import { SmartImage, StaggerItem, StaggerList } from "@/components/motion"
import type { EventWithDetails } from "@/lib/types"

interface DashboardHeaderProps {
  greeting: string
  childName?: string | null
  userInitial?: string
  avatarUrl?: string | null
  showAvatar: boolean
}

export function DashboardHeader({
  greeting,
  childName,
  userInitial,
  avatarUrl,
  showAvatar,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Dashboard
        </p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight text-balance">
          {greeting}
        </h1>
        {childName && (
          <p className="text-muted-foreground mt-1 text-sm">
            You have adventures planned for {childName} this week.
          </p>
        )}
      </div>
      {showAvatar && (
        <Avatar className="h-11 w-11 border-2 border-primary/20">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground font-bold">
            {userInitial ?? "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export function DashboardErrorState() {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        We couldn&apos;t load events right now. Please refresh to try again.
      </CardContent>
    </Card>
  )
}

export function DashboardLoadingState() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Loading events</h2>
      </div>
      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <StaggerItem key={`dashboard-skeleton-${index}`}>
            <EventCardSkeleton />
          </StaggerItem>
        ))}
      </StaggerList>
    </section>
  )
}

export function DashboardEmptyState() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-8 text-center space-y-3">
        <h2 className="text-xl font-bold text-foreground">No events yet in this city</h2>
        <p className="text-sm text-muted-foreground">
          We are still importing local family events. Try exploring another city or check back soon.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/explore">Explore</Link>
          </Button>
          <Button asChild>
            <Link to="/profile">Change city</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface DashboardTodaySectionProps {
  todayEvents: EventWithDetails[]
}

export function DashboardTodaySection({ todayEvents }: DashboardTodaySectionProps) {
  if (todayEvents.length === 0) {
    return null
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Today
        </h2>
        <Button variant="ghost" size="sm" className="text-primary gap-1" asChild>
          <Link to="/calendar">
            View Calendar <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {todayEvents.map((event, index) => {
          const isFirst = index === 0
          return (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card
                className={cn(
                  "overflow-hidden border-border/60 hover:shadow-md transition-all",
                  isFirst && "border-primary/30 bg-linear-to-r from-primary/5 to-transparent"
                )}
              >
                <CardContent className="p-4">
                  {isFirst && (
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-primary text-primary-foreground text-xs uppercase tracking-wide">
                        Today · {format(new Date(event.start_datetime), "h:mm a")}
                      </Badge>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                      <SmartImage
                        src={
                          safeImageSrc(event.images?.[0]) ??
                          `https://picsum.photos/seed/${event.id}/200/200`
                        }
                        alt={event.title}
                        className="h-full w-full object-cover"
                        placeholderClassName="h-full w-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-foreground leading-tight">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.venue_name}</span>
                      </div>
                      <div className="mt-2">
                        {isFirst ? (
                          <Button size="sm" className="h-7 text-xs gap-1.5">
                            View Details
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

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
  if (events.length === 0) {
    return null
  }

  const Icon = icon === "featured" ? Sparkles : TrendingUp

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <Button variant="ghost" size="sm" className="text-primary gap-1" asChild>
          <Link to="/explore">
            See all <ArrowRight className="h-3 w-3" />
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

interface DashboardSoonSectionProps {
  events: EventWithDetails[]
  isFavorited: (eventId: string) => boolean
  onFavoriteToggle: (eventId: string, newState: boolean) => void
}

export function DashboardSoonSection({
  events,
  isFavorited,
  onFavoriteToggle,
}: DashboardSoonSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Happening Soon
        </h2>
        <Button variant="ghost" size="sm" className="text-primary gap-1" asChild>
          <Link to="/explore">
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map((event) => (
          <StaggerItem key={event.id}>
            <EventCard
              event={{ ...event, is_favorited: isFavorited(event.id) }}
              variant="list"
              onFavoriteToggle={onFavoriteToggle}
            />
          </StaggerItem>
        ))}
      </StaggerList>
    </section>
  )
}

interface DashboardSavedSectionProps {
  savedEvents: EventWithDetails[]
  onFavoriteToggle: (eventId: string, newState: boolean) => void
}

export function DashboardSavedSection({
  savedEvents,
  onFavoriteToggle,
}: DashboardSavedSectionProps) {
  if (savedEvents.length === 0) {
    return null
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Saved Ideas</h2>
        <Button variant="ghost" size="sm" className="text-primary gap-1" asChild>
          <Link to="/saved">
            View all saved <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 divide-y divide-border/50">
          {savedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={{ ...event, is_favorited: true }}
              variant="compact"
              onFavoriteToggle={onFavoriteToggle}
            />
          ))}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full mt-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        asChild
      >
        <Link to="/saved">Explore All Saved ({savedEvents.length})</Link>
      </Button>
    </section>
  )
}

export function DashboardParentPulse() {
  return (
    <div className="rounded-2xl bg-primary p-4 flex items-start gap-3">
      <div className="h-8 w-8 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
        <Lightbulb className="h-4 w-4 text-primary-foreground" />
      </div>
      <div>
        <p className="text-primary-foreground font-semibold text-sm">Parent Pulse</p>
        <p className="text-primary-foreground/80 text-xs mt-0.5 leading-relaxed">
          Weekend sensory play sessions are usually less crowded after 11:15 AM. Early arrival
          recommended for most popular events!
        </p>
      </div>
    </div>
  )
}

export function DashboardGuestCta() {
  return (
    <div className="rounded-2xl border border-border/60 bg-family-warm p-6 text-center">
      <h3 className="text-xl font-bold text-family-warm-foreground mb-2">Never miss a playdate.</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Get a weekly curated list of weekend family events in your city.
      </p>
      <Button className="w-full sm:w-auto" asChild>
        <Link to="/sign-up">Get Started Free</Link>
      </Button>
    </div>
  )
}
