"use client"

import { useState, useEffect } from "react"
import { ImageCard } from "@/components/image-card"
import { getUserImages, likeImage, unlikeImage, type Image as ImageType } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function MyNonAiGalleryPage() {
  const [images, setImages] = useState<ImageType[]>([])
  const [isImagesLoading, setIsImagesLoading] = useState(true)
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Handle like/unlike updates locally
  const handleLikeChange = async (id: number, liked: boolean) => {
    try {
      if (liked) await likeImage(id)
      else await unlikeImage(id)
      setImages(prev =>
        prev.map(img =>
          img.id === id
            ? { ...img, user_has_liked: liked, likes_count: img.likes_count + (liked ? 1 : -1) }
            : img
        )
      )
    } catch (error) {
      console.error("Error updating like status:", error)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
    if (user) {
      const fetchImages = async () => {
        try {
          const data = await getUserImages()
          const nonAi = data.filter(img => !img.is_ai_generated)
          setImages(nonAi)
        } catch (error) {
          console.error("Error fetching non-AI images:", error)
        } finally {
          setIsImagesLoading(false)
        }
      }
      fetchImages()
    }
  }, [authLoading, user, router])

  // Wait until auth status is determined
  if (authLoading) {
    return null
  }

  if (!user) {
    return null
  }

  return (
    <div className="container py-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 pl-4">My Non AI Generated Gallery</h1>
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
      ) : images.length > 0 ? (
        <div className="image-grid px-4">
          {images.map(img => (
            <ImageCard key={img.id} image={img} onLikeChange={handleLikeChange} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500 dark:text-gray-400">No uploaded images found</p>
        </div>
      )}
    </div>
  )
}