import { Card, CardContent } from "@/components/ui/card"

export function CalendarErrorState() {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        We couldn&apos;t load calendar events right now.
      </CardContent>
    </Card>
  )
}
