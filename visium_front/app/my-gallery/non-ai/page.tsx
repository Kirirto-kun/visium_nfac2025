"use client"

import { useState, useEffect } from "react"
import { ImageCard } from "@/components/image-card"
import { getUserImages, type Image as ImageType } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function MyNonAiGalleryPage() {
  const [images, setImages] = useState<ImageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  // Handle like/unlike updates locally
  const handleLikeChange = (imageId: number, liked: boolean) => {
    setImages(prev =>
      prev.map(img =>
        img.id === imageId
          ? { ...img, user_has_liked: liked, likes_count: liked ? img.likes_count + 1 : img.likes_count - 1 }
          : img
      )
    )
  }

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    const fetchImages = async () => {
      try {
        const data = await getUserImages()
        const nonAi = data.filter(img => !img.is_ai_generated)
        setImages(nonAi)
      } catch (error) {
        console.error("Error fetching non-AI images:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchImages()
  }, [user, router])

  if (!user) return null

  return (
    <div className="container py-8 animate-fade-in">
      <nav className="flex space-x-4 mb-8">
        <Link href="/my-gallery" className="text-primary font-medium hover:underline">All</Link>
        <Link href="/my-gallery/ai" className="text-primary font-medium hover:underline">AI Only</Link>
        <Link href="/my-gallery/non-ai" className="text-primary font-medium hover:underline">Photos Only</Link>
      </nav>
      <h1 className="text-3xl font-bold mb-8">My Uploaded Images</h1>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : images.length > 0 ? (
        <div className="image-grid">
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