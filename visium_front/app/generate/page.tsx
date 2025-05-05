"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { generateAiImage, uploadImage, getAuthToken, BASE_URL } from "@/lib/api"
import { Loader2, Sparkles, Save } from "lucide-react"
import Image from "next/image"

const STYLES = [
  { value: "vivid", label: "Vivid" },
  { value: "natural", label: "Natural" },
]

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("vivid")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [blobFile, setBlobFile] = useState<File | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a description of the image you want to generate",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const response = await generateAiImage({ prompt, style })
      const url = response.url
      setImageUrl(url)
      // prepare file for edits
      const blob = await fetch(url).then(r => r.blob())
      const file = new File([blob], 'generated.png', { type: 'image/png' })
      setLocalFile(file)
      setBlobFile(null)

      toast({
        title: "Image generated",
        description: "Your AI image has been generated successfully",
      })
    } catch (error) {
      console.error("Generation error:", error)
      toast({
        title: "Generation failed",
        description: "There was an error generating your image",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleEdit() {
    if (!localFile || !prompt) return
    setIsEditing(true)
    try {
      const formData = new FormData()
      formData.append('file', localFile)
      formData.append('prompt', prompt)
      const token = getAuthToken()
      const res = await fetch(`${BASE_URL}/edit-image/`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: formData })
      if (!res.ok) throw new Error('Edit request failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setImageUrl(url)
      const file = new File([blob], 'edited.png', { type: 'image/png' })
      setBlobFile(file)
      setLocalFile(file)
      toast({ title: 'Edit complete', description: 'Image has been edited.' })
    } catch (err) {
      toast({ title: 'Edit failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally { setIsEditing(false) }
  }

  async function handleSaveToGallery() {
    let urlToSend: string | null = null
    let isAiImage = true
    if (blobFile) {
      // upload edited blob via UploadThing
      const up = new FormData()
      up.append('file', blobFile)
      const token = getAuthToken()
      const uplRes = await fetch('/api/uploadthing/server-upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: up })
      if (!uplRes.ok) throw new Error('Upload failed')
      const { urls } = await uplRes.json() as { urls?: string[] }
      if (!urls?.length) throw new Error('No URL returned from upload')
      urlToSend = urls[0]
      isAiImage = true
    } else if (localFile) {
      const fd = new FormData(); fd.append('file', localFile)
      const token = getAuthToken()
      const upl = await fetch('/api/uploadthing/server-upload', { method: 'POST', headers: token?{Authorization:`Bearer ${token}`}:undefined, body: fd })
      if (!upl.ok) throw new Error('Upload failed')
      const { urls } = await upl.json() as { urls?:string[] }
      if (!urls?.length) throw new Error('No URL')
      urlToSend = urls[0]
    }
    if (!urlToSend) return
    setIsSaving(true)
    try {
      await uploadImage(urlToSend, description, isAiImage)
      toast({ title: 'Image saved', description: 'Your image has been added to your gallery' })
      router.push('/my-gallery')
    } catch(err) { 
      console.error("Save error:", err)
      toast({
        title: "Save failed",
        description: "There was an error saving your image",
        variant: "destructive",
      })
    } finally { setIsSaving(false) }
  }

  return (
    <div className="container py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Generate & Edit AI Image</CardTitle>
          <CardDescription>Generate an image, refine with AI, then save</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!imageUrl ? (
            <>
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea id="prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the image to generate..." />
              </div>
              <div>
                <Label htmlFor="style">Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={!prompt.trim()||isGenerating} className="w-full">
                {isGenerating? 'Generating...':'Generate Image'}
              </Button>
            </>
          ) : (
            <>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                <Image src={imageUrl} alt="AI image" fill className="object-contain" />
                <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={()=>{setImageUrl(null); setLocalFile(null); setBlobFile(null); setPrompt('')}}>Reset</Button>
              </div>
              <div>
                <Label htmlFor="prompt">New Prompt</Label>
                <Textarea id="prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Refine the image with AI..." />
              </div>
              <Button onClick={handleEdit} disabled={!prompt||isEditing} className="w-full">
                {isEditing?'Editing...':'Re-Edit Image'}
              </Button>
            </>
          )}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Add a description..." />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleSaveToGallery} disabled={!(imageUrl||localFile)||isSaving} className="w-full">
            {isSaving?'Saving...':'Save to Gallery'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
