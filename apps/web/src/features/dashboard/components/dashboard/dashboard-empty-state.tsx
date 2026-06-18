import { Link } from "react-router"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

interface DashboardEmptyStateProps {
  /** Whether the user currently has a city selected. Drives the guidance copy. */
  hasCitySelected?: boolean
}

export function DashboardEmptyState({ hasCitySelected = true }: DashboardEmptyStateProps) {
  const heading = hasCitySelected
    ? "No events yet in this city"
    : "Choose a city to start discovering events"
  const body = hasCitySelected
    ? "We are still importing local family events. Try exploring another city or check back soon."
    : "Pick your area and we'll surface family-friendly events near you."

  return (
    <Card className="border-border/60">
      <CardContent className="p-8 text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">{heading}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/explore">Explore</Link>
          </Button>
          <Button asChild>
            <Link to="/profile">{hasCitySelected ? "Change city" : "Choose city"}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
