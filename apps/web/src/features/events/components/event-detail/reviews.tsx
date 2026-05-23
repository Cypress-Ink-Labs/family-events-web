import { Link } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ClientDate } from "@/components/client-date"
import { Textarea } from "@/components/ui/textarea"
import { StarRating } from "@/features/events/components/star-rating"
import type { CommentWithProfile } from "@/lib/types"

interface EventDetailReviewsProps {
  canReview: boolean
  userRating: number
  comment: string
  onCommentChange: (value: string) => void
  onRatingChange: (value: number) => void
  onSubmitComment: () => void
  isSubmitting: boolean
  comments: CommentWithProfile[]
}

export function EventDetailReviews({
  canReview,
  userRating,
  comment,
  onCommentChange,
  onRatingChange,
  onSubmitComment,
  isSubmitting,
  comments,
}: EventDetailReviewsProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Reviews</h2>

      {canReview && (
        <Card className="border-border/60 mb-4">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Leave a review</p>
            <StarRating value={userRating} onChange={onRatingChange} size="lg" />
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
            <Button size="sm" disabled={isSubmitting || !comment.trim()} onClick={onSubmitComment}>
              {isSubmitting ? "Posting..." : "Post Review"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {comments.map((commentEntry) => (
          <div key={commentEntry.id} className="flex gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs bg-muted">
                {(commentEntry.user_profiles?.display_name || "U").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {commentEntry.user_profiles?.display_name || "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  <ClientDate value={commentEntry.created_at} pattern="MMM d, yyyy" />
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{commentEntry.body}</p>
            </div>
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to add one.</p>
      )}

      {!canReview && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Sign in to leave a review</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/sign-in">Sign In</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
