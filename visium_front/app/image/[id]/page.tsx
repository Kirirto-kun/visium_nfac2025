"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getImageInfo, type Image as ImageType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, User } from "lucide-react"
import Image from "next/image"
import { CommentSection } from "@/components/comment-section"
import Link from "next/link"

export default function ImageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [image, setImage] = useState<ImageType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const imageId = Number(params.id)
        if (isNaN(imageId)) {
          throw new Error("Invalid image ID")
        }

        const data = await getImageInfo(imageId)
        setImage(data)
      } catch (error) {
        console.error("Error fetching image:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchImage()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!image) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Image not found</h1>
        <p className="mb-6">The image you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => router.push("/gallery")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Gallery
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="relative aspect-square rounded-lg overflow-hidden border">
          <Image
            src={image.image_url || "/placeholder.svg"}
            alt={image.description || "Image"}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {image.username && (
                <Link
                  href={`/user/${image.username}`}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <User className="h-4 w-4" />
                  {image.username}
                </Link>
              )}

              {image.is_ai_generated && (
                <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs">AI Generated</span>
              )}
            </div>

            <h1 className="text-2xl font-bold mb-2">{image.description || "Untitled Image"}</h1>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <span>{image.likes_count} likes</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Comments</h2>
            <CommentSection imageId={image.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
