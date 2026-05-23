import { Bookmark, CalendarDays } from "lucide-react"

interface StatsCardsProps {
  savedCount: number
  upcomingCount: number
}

export function CalendarStatsPanel({ savedCount, upcomingCount }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-card border border-border/60 rounded-2xl p-4 text-center shadow-sm">
        <div className="flex items-center justify-center mb-1">
          <Bookmark className="size-4 text-primary" />
        </div>
        <p className="text-2xl font-extrabold text-primary leading-none">{savedCount}</p>
        <p className="text-[11px] text-muted-foreground mt-1 font-medium">Saved</p>
      </div>
      <div className="bg-card border border-border/60 rounded-2xl p-4 text-center shadow-sm">
        <div className="flex items-center justify-center mb-1">
          <CalendarDays className="size-4 text-primary" />
        </div>
        <p className="text-2xl font-extrabold text-primary leading-none">{upcomingCount}</p>
        <p className="text-[11px] text-muted-foreground mt-1 font-medium">Upcoming</p>
      </div>
    </div>
  )
}
