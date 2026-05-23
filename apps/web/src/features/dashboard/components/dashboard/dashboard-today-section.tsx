import { ArrowRight, Calendar, MapPin } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ClientDate } from "@/shared/components/client-date"
import { SmartImage } from "@/shared/components/motion"
import { safeImageSrc } from "@/infrastructure/safe-url"
import { cn } from "@/shared/utils/format"
import type { EventWithDetails } from "@/shared/types"

interface DashboardTodaySectionProps {
  todayEvents: EventWithDetails[]
}

export function DashboardTodaySection({ todayEvents }: DashboardTodaySectionProps) {
  if (todayEvents.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="size-5 text-primary" />
          Upcoming Today
        </h2>
        <Button variant="ghost" size="sm" className="text-primary gap-1" asChild>
          <Link to="/calendar">
            View Calendar <ArrowRight className="size-3" />
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
                        Today · <ClientDate value={event.start_datetime} pattern="h:mm a" />
                      </Badge>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <div className="size-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                      <SmartImage
                        src={
                          safeImageSrc(event.images?.[0]) ??
                          `https://picsum.photos/seed/${event.id}/200/200`
                        }
                        alt={event.title}
                        className="size-full object-cover"
                        placeholderClassName="size-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-foreground leading-tight">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
                        <MapPin className="size-3" />
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
