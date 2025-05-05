"use client"

import { useState, useEffect } from "react"
import { ImageCard } from "@/components/image-card"
import { getUserImages, type Image as ImageType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function MyGalleryPage() {
  const [images, setImages] = useState<ImageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    const fetchImages = async () => {
      try {
        const data = await getUserImages()
        setImages(data)
      } catch (error) {
        console.error("Error fetching images:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [user, router])

  const handleLikeChange = (imageId: number, liked: boolean) => {
    setImages((prevImages) =>
      prevImages.map((img) =>
        img.id === imageId
          ? { ...img, user_has_liked: liked, likes_count: liked ? img.likes_count + 1 : img.likes_count - 1 }
          : img,
      ),
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  // All images (no filtering needed here)
   
  return (
    <div className="container py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
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
      <nav className="flex space-x-4 mb-8">
        <Link href="/my-gallery" className="text-primary font-medium hover:underline">All</Link>
        <Link href="/my-gallery/ai" className="text-primary font-medium hover:underline">AI Only</Link>
        <Link href="/my-gallery/non-ai" className="text-primary font-medium hover:underline">Photos Only</Link>
      </nav>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        images.length > 0 ? (
          <div className="image-grid">
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
