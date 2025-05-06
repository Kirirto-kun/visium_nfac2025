"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { uploadImage, BASE_URL, getAuthToken } from "@/lib/api"
import { Loader2, Upload, ImagePlus } from "lucide-react"
import Image from "next/image"
import { UploadButton, UploadDropzone } from "@/utils/uploadthing"

export default function UploadPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedResponse, setUploadedResponse] = useState<any>(null)
  const { toast } = useToast()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // new states for AI editing
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [blobFile, setBlobFile] = useState<File | null>(null)
  // Add preview URL state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Redirect to login when auth state resolves
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [authLoading, user, router])

  // generate preview URL for selected file
  useEffect(() => {
    if (localFile) {
      const url = URL.createObjectURL(localFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [localFile])

  // Wait until auth status is determined
  if (authLoading) return null
  if (!user) return null

  // Handle AI edit
  const handleEdit = async () => {
    if (!localFile || !prompt) return
    setIsEditing(true)
    try {
      const formData = new FormData()
      formData.append('file', localFile)
      formData.append('prompt', prompt)
      // attach Bearer token
      const token = getAuthToken()
      const res = await fetch(`${BASE_URL}/edit-image/`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: formData })
      if (!res.ok) throw new Error('Edit request failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setImageUrl(url)
      // create File for further edits or saving
      const file = new File([blob], 'edited.png', { type: 'image/png' })
      setBlobFile(file)
      toast({ title: 'Edit complete', description: 'Image has been edited.' })
      // after first edit, use blobFile as new source
      setLocalFile(file)
    } catch (error) {
      toast({ title: 'Edit failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setIsEditing(false)
    }
  }

  // Modify save: upload blobFile if available
  const handleSaveToGallery = async () => {
    // Consolidate: upload either edited blobFile or original localFile via UploadThing
    const fileToUpload = blobFile || localFile
    if (!fileToUpload) return
    const isAiImage = Boolean(blobFile)
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('file', fileToUpload)
      const token = getAuthToken()
      const uploadResponse = await fetch('/api/uploadthing/server-upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      })
      if (!uploadResponse.ok) throw new Error('UploadThing upload failed')
      const { urls } = await uploadResponse.json() as { urls?: string[] }
      if (!urls?.length) throw new Error('No URL returned from upload')
      const urlToSend = urls[0]
      // Post to backend: flag AI images only when editing was done
      await uploadImage(urlToSend, description, isAiImage)
      toast({ title: 'Image saved', description: 'Your image has been added to your gallery' })
      router.push('/my-gallery')
    } catch (error) {
      toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Error saving', variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Edit Image with AI</CardTitle>
          <CardDescription>Upload an image, enter prompt, and iteratively edit it</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex flex-col items-start w-full">
          {/* File + prompt inputs or preview */}
          {!imageUrl ? (
            <div className="space-y-4 w-full">
              {previewUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                  <Image src={previewUrl} alt="Uploaded image preview" fill className="object-contain" />
                </div>
              )}
              <div>
                <Label>Choose Image</Label>
                <input type="file" accept="image/*" onChange={e => { if (e.target.files) setLocalFile(e.target.files[0]) }} />
              </div>
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea id="prompt" className="w-full" placeholder="Enter AI prompt..." value={prompt} onChange={e => setPrompt(e.target.value)} />
              </div>
              <Button onClick={handleEdit} disabled={!localFile || !prompt || isEditing} className="w-full">
                {isEditing ? 'Editing...' : 'Edit Image'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                <Image src={imageUrl} alt="Edited image" fill className="object-contain" />
                <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => { setImageUrl(null); setLocalFile(null); setBlobFile(null); setPrompt('') }}>Reset</Button>
              </div>
              <div>
                <Label htmlFor="prompt">New Prompt</Label>
                <Textarea id="prompt" className="w-full" placeholder="Enter new prompt..." value={prompt} onChange={e => setPrompt(e.target.value)} />
              </div>
              <Button onClick={handleEdit} disabled={!prompt || isEditing} className="w-full">
                {isEditing ? 'Editing...' : 'Re-Edit Image'}
              </Button>
            </div>
          )}

          <div className="flex flex-col w-full space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" className="block w-full" placeholder="Add a description for your image..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <Button onClick={handleSaveToGallery} disabled={!(imageUrl || localFile) || isUploading} className="w-full">
            {isUploading ? (
              'Saving...'
            ) : (
              'Save to Gallery'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
