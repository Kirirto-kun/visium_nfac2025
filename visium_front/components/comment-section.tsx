"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { type Comment, addComment, getImageComments } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Reply } from "lucide-react"

interface CommentSectionProps {
  imageId: number
}

export function CommentSection({ imageId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true)
      try {
        const fetchedComments = await getImageComments(imageId)
        // Organize comments into a tree structure
        const topLevelComments = fetchedComments.filter((c) => !c.parent_comment_id)
        const commentReplies = fetchedComments.filter((c) => c.parent_comment_id)

        // Add replies to their parent comments
        topLevelComments.forEach((comment) => {
          comment.replies = commentReplies.filter((reply) => reply.parent_comment_id === comment.id)
        })

        setComments(topLevelComments)
      } catch (error) {
        console.error("Error fetching comments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchComments()
  }, [imageId])

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to comment",
        variant: "destructive",
      })
      return
    }

    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await addComment(imageId, newComment, replyTo)

      // Refresh comments
      const fetchedComments = await getImageComments(imageId)
      const topLevelComments = fetchedComments.filter((c) => !c.parent_comment_id)
      const commentReplies = fetchedComments.filter((c) => c.parent_comment_id)

      topLevelComments.forEach((comment) => {
        comment.replies = commentReplies.filter((reply) => reply.parent_comment_id === comment.id)
      })

      setComments(topLevelComments)
      setNewComment("")
      setReplyTo(null)
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Comments</h3>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm">{comment.username}</span>
                  <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-sm mt-1">{comment.content}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs mt-1 h-6 px-2"
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-4 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm">{reply.username}</span>
                        <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                      </div>
                      <p className="text-sm mt-1">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyTo === comment.id && (
                <div className="pl-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Write a reply..."
                      className="min-h-[60px] text-sm"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={handleSubmitComment} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
      )}

      {/* New comment form (only if not replying) */}
      {replyTo === null && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Write a comment..."
            className="min-h-[80px]"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Button onClick={handleSubmitComment} disabled={isSubmitting || !newComment.trim()} className="self-end">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Comment"}
          </Button>
        </div>
      )}
    </div>
  )
}
