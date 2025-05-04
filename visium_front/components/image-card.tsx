"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Sparkles, ExternalLink, User } from "lucide-react"
import { type Image as ImageType, likeImage, unlikeImage, getImageInfo, getUserImagesByUsername } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"
import { CommentSection } from "./comment-section"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface ImageCardProps {
  image: ImageType
  onLikeChange?: (imageId: number, liked: boolean) => void
  showComments?: boolean
}

export function ImageCard({ image, onLikeChange, showComments = false }: ImageCardProps) {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  // Handle image click: send image_id to /image-info/ then navigate
  const handleImageClick = async () => {
    try {
      await getImageInfo(image.id)
    } catch (error) {
      console.error("Error fetching image info:", error)
    }
    router.push(`/image/${image.id}`)
  }
  
  // Handle username click: fetch user's images then navigate to profile
  const handleUsernameClick = async (username: string) => {
    try {
      await getUserImagesByUsername(username)
    } catch (error) {
      console.error("Error fetching user images:", error)
    }
    router.push(`/user/${username}`)
  }

  const [liked, setLiked] = useState(image.user_has_liked || false)
  const [likesCount, setLikesCount] = useState(image.likes_count)
  const [showCommentsSection, setShowCommentsSection] = useState(showComments)

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to like images",
        variant: "destructive",
      })
      router.push("/auth/login")
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
    <Card className="overflow-hidden image-card hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-square cursor-pointer" onClick={handleImageClick}>
        <Image
          src={image.image_url || "/placeholder.svg"}
          alt={image.description || "Image"}
          fill
          className="object-cover hover:scale-105 transition-transform duration-300"
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
        <div className="flex justify-between items-center mb-2">
          {image.username ? (
            <Link
              href={`/user/${image.username}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUsernameClick(image.username!) }}
            >
              <User className="h-3 w-3" />
              {image.username}
            </Link>
          ) : (
            <span className="text-sm text-gray-500">Unknown user</span>
          )}
          <Link
            href={`/image/${image.id}`}
            className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            View
          </Link>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{image.description || "No description"}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            handleLikeToggle()
          }}
          className={cn("flex items-center gap-1", liked && "text-red-500")}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          <span>{likesCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setShowCommentsSection(!showCommentsSection)
          }}
          className="flex items-center gap-1"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Comments</span>
        </Button>
      </CardFooter>

      {showCommentsSection && (
        <div className="px-4 pb-4">
          <CommentSection imageId={image.id} />
        </div>
      )}
    </Card>
  )
}
