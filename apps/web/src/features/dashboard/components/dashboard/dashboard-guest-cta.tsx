import { Link } from "react-router"
import { Button } from "@/shared/components/ui/button"

export function DashboardGuestCta() {
  return (
    <div className="rounded-2xl border border-border/60 bg-family-warm p-6 text-center">
      <h3 className="text-xl font-semibold text-family-warm-foreground mb-2">
        Never miss a playdate.
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Get a weekly curated list of weekend family events in your city.
      </p>
      <Button className="w-full sm:w-auto" asChild>
        <Link to="/sign-up">Get Started Free</Link>
      </Button>
    </div>
  )
}
