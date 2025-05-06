"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getUserImagesByUsername, type Image as ImageType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, User } from "lucide-react"
import { ImageCard } from "@/components/image-card"

export default function UserGalleryPage() {
  const params = useParams()
  const router = useRouter()
  const [images, setImages] = useState<ImageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const username = params.username as string

  useEffect(() => {
    const fetchUserImages = async () => {
      try {
        if (!username) {
          throw new Error("Username is required")
        }

        const data = await getUserImagesByUsername(username)
        setImages(data)
      } catch (error) {
        console.error("Error fetching user images:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserImages()
  }, [username])

  const handleLikeChange = (imageId: number, liked: boolean) => {
    setImages((prevImages) =>
      prevImages.map((img) =>
        img.id === imageId
          ? { ...img, user_has_liked: liked, likes_count: liked ? img.likes_count + 1 : img.likes_count - 1 }
          : img,
      ),
    )
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            {username}'s Gallery
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : images.length > 0 ? (
        <div className="image-grid px-4">
          {images.map((image) => (
            <ImageCard key={image.id} image={image} onLikeChange={handleLikeChange} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-4">This user hasn't uploaded any images yet</p>
        </div>
      )}
    </div>
  )
}
