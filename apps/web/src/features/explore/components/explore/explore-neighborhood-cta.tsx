import { Map } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ExploreNeighborhoodCta() {
  return (
    <div className="rounded-2xl bg-muted/60 border border-border/60 p-6 text-center">
      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Map className="size-5 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">New in your neighborhood?</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Check out our interactive map for pop-up play spots.
      </p>
      <Button
        variant="outline"
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
      >
        View Map
      </Button>
    </div>
  )
}
