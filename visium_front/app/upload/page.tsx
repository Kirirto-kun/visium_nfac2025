"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { uploadImage } from "@/lib/api"
import { Loader2, Upload, ImagePlus } from "lucide-react"
import Image from "next/image"
import { UploadButton, UploadDropzone } from "@/utils/uploadthing"

export default function UploadPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedResponse, setUploadedResponse] = useState<any>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Use useEffect for navigation to avoid state updates during render
  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  // If user is not authenticated, render nothing while redirecting
  if (!user) {
    return null
  }

  const handleSaveToGallery = async () => {
    if (!imageUrl) {
      toast({
        title: "No image uploaded",
        description: "Please upload an image first",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Show the URL being sent to backend for debugging purposes
      console.log("Sending image URL to backend:", imageUrl)
      
      // Send the URL we got from UploadThing to our backend API
      await uploadImage(imageUrl, description)

      toast({
        title: "Image saved",
        description: "Your image has been added to your gallery",
      })

      router.push("/my-gallery")
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "Save failed",
        description: "There was an error saving your image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>Share your images with the community</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Upload Image</Label>
            {!imageUrl ? (
              <div className="space-y-6">
                {/* Custom styled upload button for more visibility */}
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
                  <ImagePlus className="h-12 w-12 text-primary/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload your image</h3>
                  <p className="text-sm text-muted-foreground mb-4">Click the button below to select a file</p>
                  
                  <UploadButton
                    endpoint="imageUploader"
                    onClientUploadComplete={(res) => {
                      console.log("Upload completed:", res)
                      if (res && res.length > 0) {
                        // Store the full response for debugging
                        setUploadedResponse(res[0])
                        
                        // Get the URL returned from UploadThing after successful upload
                        const url = res[0].url || res[0].fileUrl || "";
                        setImageUrl(url)
                        
                        console.log("Image URL set to:", url)
                        
                        toast({
                          title: "Upload complete",
                          description: "Your image has been uploaded successfully",
                        })
                      }
                    }}
                    onUploadError={(error) => {
                      console.error("Upload error:", error)
                      toast({
                        title: "Upload failed",
                        description: error.message,
                        variant: "destructive",
                      })
                    }}
                    // Override default UploadThing styles to make button prominent
                    className="
                      ut-button:bg-primary 
                      ut-button:text-primary-foreground 
                      ut-button:hover:bg-primary/90
                      ut-button:px-6 
                      ut-button:py-2 
                      ut-button:rounded-md
                      ut-button:font-semibold
                      ut-button:transition-all
                      ut-button:duration-200
                      ut-button:shadow-sm
                      ut-allowed-content:ut-uploading:opacity-75
                    "
                    content={{
                      button({ ready }) {
                        if (ready) return <div><p style={{color: "blue"}}>Upload 1 File</p></div>
                        return 'Getting ready...'
                      },
                      allowedContent({ ready }) {
                        if (ready) return 'Images up to 4MB'
                        return 'Checking...'
                      }
                    }}
                  />
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Supported formats: JPEG, PNG, GIF
                  </p>
                </div>
                
                
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                  <Image src={imageUrl} alt="Uploaded image" fill className="object-contain" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setImageUrl(null)}
                  >
                    Change
                  </Button>
                </div>
                
                {/* Display the URL for verification */}
                <div className="rounded bg-muted p-2 text-xs overflow-auto">
                  <p className="font-semibold">Image URL:</p>
                  <p className="break-all">{imageUrl}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a description for your image..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleSaveToGallery} disabled={!imageUrl || isUploading} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Save to Gallery
              </>
            )}
          </Button>
          
          {/* Debug info - this will help understand what's happening */}
          {uploadedResponse && (
            <div className="w-full rounded bg-muted p-2 text-xs">
              <details>
                <summary className="cursor-pointer font-semibold">Upload Response Details</summary>
                <pre className="mt-2 overflow-auto">
                  {JSON.stringify(uploadedResponse, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
