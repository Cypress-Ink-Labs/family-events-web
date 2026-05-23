import type { Clock } from "lucide-react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { FormGrid } from "@/components/v2"

export interface EventDetailInfoItem {
  label: string
  value: string
  icon: typeof Clock
}

export function EventDetailInfoGrid({ infoItems }: { infoItems: EventDetailInfoItem[] }) {
  return (
    <FormGrid cols={2} gap="3">
      {infoItems.map((item) => (
        <Card key={item.label} className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <item.icon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="font-display text-sm font-medium text-foreground">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </FormGrid>
  )
}
