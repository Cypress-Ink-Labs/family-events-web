import { Lightbulb } from "lucide-react"

export function DashboardParentPulse() {
  return (
    <div className="rounded-2xl bg-primary p-4 flex items-start gap-3">
      <div className="size-8 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
        <Lightbulb className="size-4 text-primary-foreground" />
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
