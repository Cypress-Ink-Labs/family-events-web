import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

export function DashboardEmptyState() {
  return (
    <Card className="border-border/60">
      <CardContent className="p-8 text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">No events yet in this city</h2>
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
