"use client"

import { useState, useEffect } from "react"
import { ImageCard } from "@/components/image-card"
import { getPublicImages, type Image as ImageType } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from 'next/link'

export default function AiGalleryPage() {
  const [images, setImages] = useState<ImageType[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true)
        const data = await getPublicImages()
        const aiOnly = data.filter(img => img.is_ai_generated)
        setImages(aiOnly)
        setFilteredImages(aiOnly)
      } catch (error) {
        console.error("Error fetching AI images:", error)
        toast({
          title: "Error",
          description: "Failed to load AI-generated images. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchImages()
  }, [toast])

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredImages(images)
      return
    }

    const filtered = images.filter(image =>
      image.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredImages(filtered)
  }

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
      <nav className="flex space-x-4 mb-8">
        <Link href="/gallery" className="text-primary font-medium hover:underline">All</Link>
        <Link href="/gallery/ai" className="text-primary font-medium hover:underline">AI Only</Link>
        <Link href="/gallery/non-ai" className="text-primary font-medium hover:underline">Photos Only</Link>
      </nav>
      <h1 className="text-3xl font-bold mb-8">AI Generated Gallery</h1>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredImages.length > 0 ? (
        <div className="image-grid">
          {filteredImages.map(image => (
            <ImageCard key={image.id} image={image} onLikeChange={handleLikeChange} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500 dark:text-gray-400">No AI images found</p>
        </div>
      )}
    </div>
  )
}