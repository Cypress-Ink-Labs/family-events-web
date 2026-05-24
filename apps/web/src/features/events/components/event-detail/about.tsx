import { Info } from "lucide-react"

export function EventDetailAbout({ description }: { description: string | null }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3">About the Experience</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

      <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-4 flex gap-3">
        <Info className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">
            Parent Tip
          </p>

          <p className="text-xs text-blue-600 dark:text-blue-500 leading-relaxed">
            We recommend arriving 10 minutes early to let your toddler get comfortable with the
            space before the session begins!
          </p>
        </div>
      </div>
    </div>
  )
}
