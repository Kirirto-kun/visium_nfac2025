import { toast } from "@/components/ui/use-toast"

export const BASE_URL = "http://127.0.0.1:8000"

// Helper function to get the auth token, supporting both 'user' and 'jwt' keys
const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("user")
    if (user) {
      try {
        return JSON.parse(user).token
      } catch {}
    }
    // Fallback for Google login storing token under 'jwt'
    const jwt = localStorage.getItem("jwt")
    if (jwt) {
      return jwt
    }
  }
  return null
}

// Helper function for API requests
async function apiRequest<T>(endpoint: string, method = "GET", data?: any, requiresAuth = true): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (requiresAuth) {
    const token = getAuthToken()
    if (!token) {
      throw new Error("Authentication required")
    }
    headers["Authorization"] = `Bearer ${token}`
  }

  const config: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Request failed with status ${response.status}`)
    }

    // For DELETE requests that don't return content
    if (response.status === 204) {
      return {} as T
    }

    return await response.json()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('You have not liked this post')) {
      // Expected error for unliking a post that wasn't liked; rethrow without logging
      throw error
    }
    console.error("API request error:", error)
    toast({
      title: "Error",
      description: msg,
      variant: "destructive",
    })
    throw error
  }
}

// API functions
export interface Image {
  id: number
  image_url: string
  description: string
  is_ai_generated: boolean
  likes_count: number
  user_has_liked?: boolean
  username?: string
}

export interface Comment {
  id: number
  content: string
  created_at: string
  user: {
    username: string
  }
  parent_comment_id: number | null
  replies?: Comment[]
}

// Get all public images
export const getPublicImages = () => apiRequest<Image[]>("/get-images/")

// Get user's uploaded images
export const getUserImages = () => apiRequest<Image[]>("/get-my-images/")

// Upload an image
export const uploadImage = (imageUrl: string, description: string, isAiGenerated = false) =>
  apiRequest<Image>("/images/", "POST", { image_url: imageUrl, description, is_ai_generated: isAiGenerated })

// Generate an AI image
export interface GenerateImageParams {
  prompt: string
  style?: string
}

export interface GenerateImageResponse {
  url: string
}

export const generateAiImage = (params: GenerateImageParams) =>
  apiRequest<GenerateImageResponse>("/generate-image/", "POST", params)

// Like an image
export const likeImage = (imageId: number) => apiRequest("/likes/", "POST", { image_id: imageId })

// Unlike an image
export const unlikeImage = (imageId: number) => apiRequest("/likes/", "DELETE", { image_id: imageId })

// Get comments for an image
export const getImageComments = (imageId: number) =>
  apiRequest<Comment[]>("/comments/image/", "POST", { image_id: imageId })

// Add a comment to  =>
//  apiRequest<Comment[]>('/comments/image/', 'POST', { image_id: imageId })

// Add a comment to an image
export const addComment = (imageId: number, content: string, parentCommentId: number | null = null) =>
  apiRequest("/comments/", "POST", { image_id: imageId, content, parent_comment_id: parentCommentId })

// Search images by text
export const searchByText = (query: string) => apiRequest<Image[]>("/search/", "POST", { query })

// Search images by image
export const searchByImage = (imageUrl: string) =>
  apiRequest<Image[]>("/search-by-image/", "POST", { image_url: imageUrl })

// Get detailed info for an image
export const getImageInfo = (imageId: number) =>
  apiRequest<Image>("/image-info/", "POST", { image_id: imageId })

// Get another user's images by username
export const getUserImagesByUsername = (username: string) =>
  apiRequest<Image[]>('/user-images/', 'POST', { username }, false)

export { getAuthToken }
