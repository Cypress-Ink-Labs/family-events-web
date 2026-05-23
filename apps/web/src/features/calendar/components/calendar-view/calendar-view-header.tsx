import { CalendarDays, List } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PageHeaderProps {
  view: "month" | "week"
  onViewChange: (view: "month" | "week") => void
}

export function CalendarViewHeader({ view, onViewChange }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Calendar
        </p>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Your Adventures</h1>
      </div>
      <Tabs value={view} onValueChange={(nextView) => onViewChange(nextView as "month" | "week")}>
        <TabsList className="h-9">
          <TabsTrigger value="month" className="text-xs gap-1.5 px-3">
            <CalendarDays className="size-3.5" />
            Month
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs gap-1.5 px-3">
            <List className="size-3.5" />
            Week
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
