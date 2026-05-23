import { useMemo } from "react"
import { Check, Flag, Trash2, MessageSquare } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ClientDate } from "@/shared/components/client-date"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import {
  useAdminComments,
  useDeleteAdminComment,
  useUpdateAdminComment,
  type AdminComment,
} from "@/features/admin/hooks/use-admin-comments"
import { useAdminToast } from "@/features/admin/hooks/use-admin-toast"
import { toast } from "sonner"
import { Toolbar } from "@/components/v2"

interface CommentCardProps {
  c: AdminComment
  onApprove: (id: string) => void
  onRemove: (id: string) => void
}

function CommentCard({ c, onApprove, onRemove }: CommentCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-xs bg-muted">
              {(c.user_profiles?.display_name || "A").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">
                {c.user_profiles?.display_name || "Anonymous"}
              </span>
              <span className="text-xs text-muted-foreground">on</span>
              <span className="text-xs font-medium text-primary truncate">
                {c.events?.title || "Event"}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                <ClientDate value={c.created_at} pattern="MMM d" />
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{c.body}</p>
            <div className="flex items-center gap-2 mt-2">
              {c.is_flagged && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <Flag className="size-2.5" /> Flagged
                </Badge>
              )}
              {!c.is_approved && !c.is_flagged && (
                <Badge variant="outline" className="text-[10px]">
                  Pending
                </Badge>
              )}
              {!c.is_approved && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-green-600 hover:text-green-700"
                  onClick={() => onApprove(c.id)}
                >
                  <Check className="size-3" /> Approve
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={() => onRemove(c.id)}
              >
                <Trash2 className="size-3" /> Remove
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminCommentsPage() {
  const { data: comments = [] } = useAdminComments()
  const updateComment = useUpdateAdminComment()
  const deleteComment = useDeleteAdminComment()
  const { toastError } = useAdminToast()

  async function approve(id: string) {
    try {
      await updateComment.mutateAsync({
        commentId: id,
        updates: { is_approved: true, is_flagged: false },
      })
      toast.success("Comment approved")
    } catch (error) {
      toastError(error, "Failed to approve comment.")
    }
  }

  async function remove(id: string) {
    try {
      await deleteComment.mutateAsync({ commentId: id })
      toast("Comment removed")
    } catch (error) {
      toastError(error, "Failed to remove comment.")
    }
  }

  const { flagged, approved, pending } = useMemo(() => {
    return {
      flagged: comments.filter((comment) => comment.is_flagged),
      approved: comments.filter((comment) => comment.is_approved && !comment.is_flagged),
      pending: comments.filter((comment) => !comment.is_approved && !comment.is_flagged),
    }
  }, [comments])

  return (
    <div className="space-y-6">
      <Toolbar title="Comment Moderation" subtitle={`${comments.length} total`} />

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({comments.length})</TabsTrigger>
          <TabsTrigger value="flagged">
            Flagged{" "}
            {flagged.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {flagged.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
        </TabsList>

        {[
          { value: "all", list: comments },
          { value: "flagged", list: flagged },
          { value: "pending", list: pending },
          { value: "approved", list: approved },
        ].map(({ value, list }) => (
          <TabsContent key={value} value={value} className="mt-4 space-y-3">
            {list.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No comments here</p>
              </div>
            ) : (
              list.map((c) => (
                <CommentCard key={c.id} c={c} onApprove={approve} onRemove={remove} />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
