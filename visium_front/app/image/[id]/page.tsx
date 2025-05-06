"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { getImageInfo, type Image as ImageType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, User, Download, Share2 } from "lucide-react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import Image from "next/image"
import { CommentSection } from "@/components/comment-section"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { getAuthToken, BASE_URL, uploadImage } from "@/lib/api"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function ImageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [image, setImage] = useState<ImageType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUrl, setCurrentUrl] = useState('')
  const { toast } = useToast()
  const [actionPrompt, setActionPrompt] = useState('')
  const [newImageUrl, setNewImageUrl] = useState<string>(image?.image_url || '')
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [blobFile, setBlobFile] = useState<File | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const ACTIONS = [
    { value: "create action figure, as if a person is a doll in a package", label: "Action Figure" },
    { value: "change style to ghibli", label: "Ghibli" },
    { value: "enhance with ai", label: "Enhance" },
    { value: "AI Barbie Box", label: "Barbie Box" },
  ]

  const handleDownload = useCallback(async () => {
    if (!image?.image_url) return;
    try {
      const response = await fetch(image.image_url);
      const blob = await response.blob();
      const img = new window.Image();
      const blobUrlTemp = URL.createObjectURL(blob);
      img.src = blobUrlTemp;
      await new Promise(resolve => { img.onload = resolve; });
      URL.revokeObjectURL(blobUrlTemp);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
      const pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!pngBlob) {
        throw new Error('Canvas toBlob failed');
      }
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${image.id}-${image.description || 'image'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    } catch (err) {
      console.error('Download failed', err);
    }
  }, [image]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href)
    }
  }, [])

  useEffect(() => {
    if (image) {
      setNewImageUrl(image.image_url)
    }
  }, [image])

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

  const handleApplyAction = async () => {
    if (!actionPrompt) return
    setIsApplying(true)
    try {
      const resp = await fetch(newImageUrl)
      const blob = await resp.blob()
      const file = new File([blob], 'toedit.png', { type: blob.type })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('prompt', actionPrompt)
      const token = getAuthToken()
      const res = await fetch(`${BASE_URL}/edit-image/`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: formData })
      if (!res.ok) throw new Error('Edit request failed')
      const editedBlob = await res.blob()
      const url = URL.createObjectURL(editedBlob)
      setNewImageUrl(url)
      const editedFile = new File([editedBlob], 'edited.png', { type: editedBlob.type })
      setBlobFile(editedFile)
      setLocalFile(editedFile)
      toast({ title: 'Action applied', description: `Image updated with: ${actionPrompt}` })
    } catch (err) {
      toast({ title: 'Action failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setIsApplying(false)
    }
  }

  const handleSaveToGallery = async () => {
    const target = blobFile || localFile
    if (!target) return
    setIsSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', target)
      const token = getAuthToken()
      const upl = await fetch('/api/uploadthing/server-upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: fd })
      if (!upl.ok) throw new Error('Upload failed')
      const { urls } = await upl.json() as { urls?: string[] }
      if (!urls?.length) throw new Error('No URL returned')
      await uploadImage(urls[0], image?.description || '', true)
      toast({ title: 'Image saved', description: 'Your edited image has been saved to your gallery' })
      router.push('/my-gallery')
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

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
      <div className="flex items-center mb-6 space-x-2">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {image?.image_url && (
          <>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Image</DialogTitle>
                  <DialogDescription>Copy the URL below to share:</DialogDescription>
                </DialogHeader>
                <div className="mt-2">
                  <input
                    readOnly
                    value={currentUrl}
                    onFocus={e => e.target.select()}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(currentUrl)}
                  >
                    Copy
                  </Button>
                  <DialogClose asChild>
                    <Button>Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden border">
            <Image
              src={newImageUrl || "/placeholder.svg"}
              alt={image?.description || "Image"}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {/* AI Action Controls */}
          <div className="mb-6 space-y-4">
            <div>
              <Label htmlFor="action">AI Action</Label>
              <Select value={actionPrompt} onValueChange={setActionPrompt}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleApplyAction} disabled={!actionPrompt || isApplying} className="w-full">
              {isApplying ? 'Applying...' : 'Apply Action'}
            </Button>
            <Button onClick={handleSaveToGallery} disabled={!(blobFile || localFile) || isSaving} className="w-full">
              {isSaving ? 'Saving...' : 'Save to Gallery'}
            </Button>
          </div>
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
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5 2.74-2 4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
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
