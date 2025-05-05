"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { searchByText, searchByImage, type Image as ImageType } from "@/lib/api"
import { Loader2, Search } from "lucide-react"
import { ImageCard } from "@/components/image-card"
import Image from "next/image"
import { UploadDropzone } from "@/utils/uploadthing"

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ImageType[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState("text")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { toast } = useToast()

  const handleTextSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Empty search",
        description: "Please enter a search term",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)

    try {
      const results = await searchByText(searchQuery)
      setSearchResults(results)

      if (results.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different search term",
        })
      }
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Search failed",
        description: "There was an error performing your search",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setImageFile(selectedFile)

      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleImageSearch = async (uploadedImageUrl?: string) => {
    const imageUrlToSearch = uploadedImageUrl || imagePreview

    if (!imageUrlToSearch) {
      toast({
        title: "No image selected",
        description: "Please select an image to search with",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)

    try {
      // Search by image using the uploaded URL
      const results = await searchByImage(imageUrlToSearch)
      setSearchResults(results)

      if (results.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different image",
        })
      }
    } catch (error) {
      console.error("Image search error:", error)
      toast({
        title: "Search failed",
        description: "There was an error performing your search",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleLikeChange = (imageId: number, liked: boolean) => {
    setSearchResults((prevResults) =>
      prevResults.map((img) =>
        img.id === imageId
          ? { ...img, user_has_liked: liked, likes_count: liked ? img.likes_count + 1 : img.likes_count - 1 }
          : img,
      ),
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Search Images</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Find images by text or by uploading a similar image</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="text">Text Search</TabsTrigger>
              <TabsTrigger value="image">Image Search</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search for images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSearch()}
                  className="flex-1"
                />
                <Button onClick={handleTextSearch} disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <div className="space-y-4">
                {!imagePreview ? (
                  <UploadDropzone
                    endpoint="imageUploader"
                    onClientUploadComplete={(res) => {
                      if (res && res.length > 0) {
                        setImagePreview(res[0].url)
                        setImageFile(null) // We don't need the file anymore

                        // Automatically search with the uploaded image
                        handleImageSearch(res[0].url)
                      }
                    }}
                    onUploadError={(error) => {
                      toast({
                        title: "Upload failed",
                        description: error.message,
                        variant: "destructive",
                      })
                    }}
                    className="min-h-[200px] w-full max-w-md mx-auto border-2 border-dashed border-gray-300 p-6 text-center flex flex-col items-center justify-center bg-white
                      ut-label:!text-gray-800 ut-button:!block ut-button:!bg-blue-600 ut-button:!text-white ut-button:!px-4 ut-button:!py-2 ut-button:!rounded ut-button:hover:!bg-blue-700"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="relative aspect-video w-full max-w-md rounded-lg border">
                      <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-contain" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setImagePreview(null)}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Search Results</h2>
          <div className="image-grid">
            {searchResults.map((image) => (
              <ImageCard key={image.id} image={image} onLikeChange={handleLikeChange} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
