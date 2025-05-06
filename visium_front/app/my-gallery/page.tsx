"use client"

import { useState, useEffect } from "react"
import { ImageCard } from "@/components/image-card"
import { getUserImages, likeImage, unlikeImage, type Image as ImageType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function MyGalleryPage() {
  const [images, setImages] = useState<ImageType[]>([])
  const [isImagesLoading, setIsImagesLoading] = useState(true)
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Redirect to login when auth state is known and no user
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [authLoading, user, router])

  // Fetch user images once authenticated
  useEffect(() => {
    if (user) {
      const fetchImages = async () => {
        try {
          const data = await getUserImages()
          setImages(data)
        } catch (error) {
          console.error("Error fetching images:", error)
        } finally {
          setIsImagesLoading(false)
        }
      }
      fetchImages()
    }
  }, [user])

  // Handle like/unlike actions and update UI
  const handleLikeChange = async (id: number, liked: boolean) => {
    try {
      if (liked) {
        await likeImage(id)
      } else {
        await unlikeImage(id)
      }
      setImages(prev =>
        prev.map(img =>
          img.id === id
            ? {
                ...img,
                likes_count: img.likes_count + (liked ? 1 : -1),
                user_has_liked: liked,
              }
            : img
        )
      )
    } catch (error) {
      console.error("Error updating like status:", error)
    }
  }

  if (authLoading) {
    return null
  }

  if (!user) {
    return null
  }

  return (
    <div className="container py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8 pl-4">
        <h1 className="text-3xl font-bold">My Gallery</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/upload">
              <Plus className="h-4 w-4 mr-2" />
              Upload Image
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/generate">
              <Plus className="h-4 w-4 mr-2" />
              Generate Image
            </Link>
          </Button>
        </div>
      </div>
      <nav className="flex space-x-4 mb-8 pl-4">
        <Link href="/my-gallery" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/30 transition">
          All
        </Link>
        <Link href="/my-gallery/ai" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/30 transition">
          AI generated gallery
        </Link>
        <Link href="/my-gallery/non-ai" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/30 transition">
          Non AI generated gallery
        </Link>
      </nav>

      {isImagesLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        images.length > 0 ? (
          <div className="image-grid px-4">
            {images.map(image => (
              <ImageCard key={image.id} image={image} onLikeChange={handleLikeChange} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500 dark:text-gray-400">You haven't added any images yet</p>
          </div>
        )
      )}
    </div>
  )
}
