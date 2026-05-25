import { Link } from "react-router"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

export function EventDetailErrorState() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-destructive">We couldn&apos;t load that event right now.</p>
          <Button variant="outline" asChild>
            <Link to="/explore">Back to Explore</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
