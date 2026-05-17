import { Trash2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StarRating } from "@/features/events/components/star-rating"
import { useAdminRatings, useDeleteAdminRating } from "@/features/admin/hooks/use-admin-ratings"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"
import { Toolbar } from "@/components/v2"

export function AdminRatingsPage() {
  const { data: ratings = [] } = useAdminRatings()
  const deleteRating = useDeleteAdminRating()
  const { toastError } = useAdminToast()

  async function handleRemove(id: string) {
    try {
      await deleteRating.mutateAsync({ ratingId: id })
      toast("Rating removed")
    } catch (error) {
      toastError(error, "Failed to remove rating.")
    }
  }

  const avg =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
      : "0"

  return (
    <div className="space-y-6">
      <Toolbar title="Ratings" subtitle={`${ratings.length} ratings · ${avg} avg`} />

      <div className="space-y-3">
        {ratings.map((r) => (
          <Card key={r.id} className="border-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-muted text-xs">
                  {(r.user_profiles?.display_name || "A").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold">
                    {r.user_profiles?.display_name || "Anonymous"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    on {r.events?.title || "Event"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StarRating value={r.score} readonly size="sm" />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {format(new Date(r.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 text-destructive hover:bg-destructive/10"
                onClick={() => handleRemove(r.id)}
                aria-label="Remove rating"
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
