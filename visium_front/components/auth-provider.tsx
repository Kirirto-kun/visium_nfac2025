"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

type User = {
  username: string
  email?: string
  token: string
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isLoading: false,
  isAuthenticated: false,
})

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const baseUrl = "https://visium-backend-1c09dc82b726.herokuapp.com"

  // Load user from localStorage on initial render and set up storage event listener
  useEffect(() => {
    const loadUserFromStorage = () => {
      const storedUser = localStorage.getItem("user")
      const expiryString = localStorage.getItem("userExpiry")
      if (storedUser && expiryString) {
        const expiry = Number.parseInt(expiryString, 10)
        if (Date.now() < expiry) {
          try {
            const parsedUser = JSON.parse(storedUser)
            setUser(parsedUser)
            setIsAuthenticated(true)
          } catch (error) {
            console.error("Failed to parse stored user:", error)
            localStorage.removeItem("user")
            localStorage.removeItem("userExpiry")
          }
        } else {
          localStorage.removeItem("user")
          localStorage.removeItem("userExpiry")
        }
      } else {
        // Fallback for Google login: JWT stored under 'jwt'
        const jwt = localStorage.getItem("jwt")
        if (jwt) {
          const userData = { username: "", token: jwt }
          setUser(userData)
          setIsAuthenticated(true)
          // Persist in same format
          const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
          localStorage.setItem("user", JSON.stringify(userData))
          localStorage.setItem("userExpiry", expiresAt.toString())
        }
      }
      setIsLoading(false)
    }

    // Load user on initial render
    loadUserFromStorage()

    // Set up storage event listener for cross-tab synchronization
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "user") {
        if (event.newValue) {
          try {
            const parsedUser = JSON.parse(event.newValue)
            setUser(parsedUser)
            setIsAuthenticated(true)
          } catch (error) {
            console.error("Failed to parse stored user from storage event:", error)
          }
        } else {
          setUser(null)
          setIsAuthenticated(false)
          // Redirect to login if on a protected page
          if (
            pathname.startsWith("/my-gallery") ||
            pathname.startsWith("/upload") ||
            pathname.startsWith("/generate")
          ) {
            router.push("/auth/login")
          }
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [pathname, router])

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${baseUrl}/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        throw new Error("Login failed")
      }

      const data = await response.json()
      const userData = {
        username,
        token: data.access_token,
      }

      // Store user data with an expiration time (7 days)
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
      localStorage.setItem("user", JSON.stringify(userData))
      localStorage.setItem("userExpiry", expiresAt.toString())

      setUser(userData)
      setIsAuthenticated(true)

      toast({
        title: "Login successful",
        description: `Welcome back, ${username}!`,
      })

      router.push("/gallery")
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      })
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${baseUrl}/signup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      })

      if (!response.ok) {
        throw new Error("Registration failed")
      }

      toast({
        title: "Registration successful",
        description: "Your account has been created. Please log in.",
      })
      router.push("/auth/login")
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Please try again with different credentials.",
        variant: "destructive",
      })
      console.error("Registration error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("userExpiry")
    setUser(null)
    setIsAuthenticated(false)

    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    })

    router.push("/")
  }

  // Check for token expiration
  useEffect(() => {
    const checkTokenExpiration = () => {
      const expiryString = localStorage.getItem("userExpiry")
      if (expiryString) {
        const expiry = Number.parseInt(expiryString, 10)
        if (Date.now() > expiry) {
          // Token has expired
          logout()
          toast({
            title: "Session expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
        }
      }
    }

    // Check on initial load
    checkTokenExpiration()

    // Set up interval to check periodically
    const interval = setInterval(checkTokenExpiration, 60 * 1000) // Check every minute
    return () => clearInterval(interval)
  }, [toast])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}
