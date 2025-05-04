"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { generateAiImage, uploadImage } from "@/lib/api"
import { Loader2, Sparkles, Save } from "lucide-react"
import Image from "next/image"

const STYLES = [
  { value: "vivid", label: "Vivid" },
  { value: "realistic", label: "Realistic" },
  { value: "anime", label: "Anime" },
  { value: "painting", label: "Painting" },
  { value: "sketch", label: "Sketch" },
]

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("vivid")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  if (!user) {
    router.push("/auth/login")
    return null
  }

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
      setGeneratedImage(response.url)

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

  const handleSave = async () => {
    if (!generatedImage) return

    setIsSaving(true)

    try {
      await uploadImage(generatedImage, prompt, true)

      toast({
        title: "Image saved",
        description: "Your generated image has been saved to your gallery",
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
      setIsSaving(false)
    }
  }

  return (
    <div className="container py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Generate AI Image
          </CardTitle>
          <CardDescription>Create unique images with AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
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

          {generatedImage && (
            <div className="space-y-2 mt-4">
              <Label>Generated Image</Label>
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border">
                <Image
                  src={generatedImage || "/placeholder.svg"}
                  alt="Generated image"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="flex-1">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>

          {generatedImage && (
            <Button onClick={handleSave} disabled={isSaving} variant="outline" className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save to Gallery
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
