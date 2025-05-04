"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Sparkles } from "lucide-react"
import { type Image as ImageType, likeImage, unlikeImage } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"
import { CommentSection } from "./comment-section"
import { cn } from "@/lib/utils"

interface ImageCardProps {
  image: ImageType
  onLikeChange?: (imageId: number, liked: boolean) => void
}

export function ImageCard({ image, onLikeChange }: ImageCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [liked, setLiked] = useState(image.user_has_liked || false)
  const [likesCount, setLikesCount] = useState(image.likes_count)
  const [showComments, setShowComments] = useState(false)

  const handleLikeToggle = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to like images",
        variant: "destructive",
      })
      return
    }

    try {
      if (liked) {
        await unlikeImage(image.id)
        setLikesCount((prev) => prev - 1)
      } else {
        await likeImage(image.id)
        setLikesCount((prev) => prev + 1)
      }

      setLiked(!liked)
      if (onLikeChange) {
        onLikeChange(image.id, !liked)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    }
  }

  return (
    <Card className="overflow-hidden image-card">
      <div className="relative aspect-square">
        <Image
          src={image.image_url || "/placeholder.svg"}
          alt={image.description || "Image"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {image.is_ai_generated && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs flex items-center">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Generated
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{image.description || "No description"}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLikeToggle}
          className={cn("flex items-center gap-1", liked && "text-red-500")}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          <span>{likesCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Comments</span>
        </Button>
      </CardFooter>

      {showComments && (
        <div className="px-4 pb-4">
          <CommentSection imageId={image.id} />
        </div>
      )}
    </Card>
  )
}
