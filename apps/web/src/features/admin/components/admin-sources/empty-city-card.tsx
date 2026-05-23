import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface EmptyCityCardProps {
  label: string
  onAddSource: () => void
}

export function EmptyCityCard({ label, onAddSource }: EmptyCityCardProps) {
  return (
    <Card className="border-dashed border-border/60 bg-muted/20">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No sources yet. Add one to start ingesting events for this city.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] shrink-0 gap-1.5"
            onClick={onAddSource}
          >
            <Plus className="size-3.5" />
            Add source
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
