"use client"

import { useState, useEffect } from "react"
import { ImageCard } from "@/components/image-card"
import { getPublicImages, type Image as ImageType } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function GalleryPage() {
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
        setImages(data)
        setFilteredImages(data)
      } catch (error) {
        console.error("Error fetching images:", error)
        toast({
          title: "Error",
          description: "Failed to load gallery images. Please try again later.",
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

    const filtered = images.filter((image) => image.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredImages(filtered)
  }

  const handleLikeChange = (imageId: number, liked: boolean) => {
    setImages((prevImages) =>
      prevImages.map((img) =>
        img.id === imageId
          ? { ...img, user_has_liked: liked, likes_count: liked ? img.likes_count + 1 : img.likes_count - 1 }
          : img,
      ),
    )

    setFilteredImages((prevImages) =>
      prevImages.map((img) =>
        img.id === imageId
          ? { ...img, user_has_liked: liked, likes_count: liked ? img.likes_count + 1 : img.likes_count - 1 }
          : img,
      ),
    )
  }

  return (
    <div className="container py-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">Explore Gallery</h1>

      <div className="flex gap-2 mb-8">
        <Input
          placeholder="Search images..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-md"
        />
        <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredImages.length > 0 ? (
        <div className="image-grid">
          {filteredImages.map((image) => (
            <ImageCard key={image.id} image={image} onLikeChange={handleLikeChange} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500 dark:text-gray-400">No images found</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Try a different search term</p>
        </div>
      )}
    </div>
  )
}
