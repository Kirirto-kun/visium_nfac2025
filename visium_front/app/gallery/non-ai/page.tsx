"use client"

import { useState, useEffect } from "react"
import { ImageCard } from "@/components/image-card"
import { getPublicImages, type Image as ImageType } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function NonAiGalleryPage() {
  const [images, setImages] = useState<ImageType[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true)
        const data = await getPublicImages()
        const nonAi = data.filter(img => !img.is_ai_generated)
        setImages(nonAi)
        setFilteredImages(nonAi)
      } catch (error) {
        console.error("Error fetching non-AI images:", error)
        toast({
          title: "Error",
          description: "Failed to load images. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [toast])

  const handleLikeChange = (imageId: number, liked: boolean) => {
    setImages(prev =>
      prev.map(img =>
        img.id === imageId
          ? { ...img, user_has_liked: liked, likes_count: liked ? img.likes_count + 1 : img.likes_count - 1 }
          : img
      )
    )
    setFilteredImages(prev =>
      prev.map(img =>
        img.id === imageId
          ? { ...img, user_has_liked: liked, likes_count: liked ? img.likes_count + 1 : img.likes_count - 1 }
          : img
      )
    )
  }

  return (
    <div className="container py-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 pl-4">Non-AI Generated Gallery</h1>
      <nav className="flex space-x-4 mb-8 pl-4">
      <Link href="/gallery" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/30 transition">
          All
        </Link>
        <Link href="/gallery/ai" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/30 transition">
          AI generated gallery
        </Link>
        <Link href="/gallery/non-ai" className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-primary font-medium hover:bg-primary/10 dark:hover:bg-primary/30 transition">
          Non AI generated gallery
        </Link>
      </nav>
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredImages.length > 0 ? (
        <div className="image-grid px-4">
          {filteredImages.map(image => (
            <ImageCard key={image.id} image={image} onLikeChange={handleLikeChange} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500 dark:text-gray-400">No images found</p>
        </div>
      )}
    </div>
  )
}