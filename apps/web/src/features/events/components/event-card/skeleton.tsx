import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function EventCardSkeleton({
  variant = "default",
}: {
  variant?: "default" | "compact" | "list"
}) {
  if (variant === "compact") {
    return (
      <div className="flex gap-3 items-center py-3">
        <Skeleton className="size-14 rounded-xl shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-1.5" />
          <Skeleton className="h-3 w-1/2 mb-1.5" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    )
  }

  return (
    <Card className="overflow-hidden">
      <Skeleton className={variant === "list" ? "w-full h-52" : "w-full h-44"} />
      <CardContent className="p-3">
        <Skeleton className="h-3 w-1/2 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/3" />
      </CardContent>
    </Card>
  )
}
