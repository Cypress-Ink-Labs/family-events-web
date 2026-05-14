import { Trash2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StarRating } from "@/features/events/components/star-rating"
import { useAdminRatings, useDeleteAdminRating } from "@/features/admin/hooks/use-admin-ratings"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Ratings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {ratings.length} ratings · {avg} avg
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {ratings.map((r) => (
          <Card key={r.id} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-muted">
                  {(r.user_profiles?.display_name || "A").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {r.user_profiles?.display_name || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    on {r.events?.title || "Event"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating value={r.score} readonly size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => handleRemove(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
