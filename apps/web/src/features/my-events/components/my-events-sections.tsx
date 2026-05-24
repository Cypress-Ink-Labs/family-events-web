import { Card, CardContent } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { StaggerItem, StaggerList } from "@/shared/components/motion"

export { EventRow } from "./event-row"
export { EmptyState } from "./my-events-empty-state"

export function LoadingRows() {
  return (
    <StaggerList className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <StaggerItem key={`loading-row-${index}`}>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="size-16 sm:h-20 sm:w-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      ))}
    </StaggerList>
  )
}
