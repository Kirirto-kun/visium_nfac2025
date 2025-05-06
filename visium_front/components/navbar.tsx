"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { ModeToggle } from "./mode-toggle"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Upload, ImagePlus, LogOut, User } from "lucide-react"
import { usePathname } from "next/navigation"

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  // Don't show navbar on auth pages
  if (pathname.startsWith("/auth/")) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 pl-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-violet-600">
              Visium
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/gallery" className="text-sm font-medium transition-colors hover:text-primary">
            Gallery
          </Link>
          <Link href="/my-gallery" className="text-sm font-medium transition-colors hover:text-primary">
            My Gallery
          </Link>
          <Link href="/generate" className="text-sm font-medium transition-colors hover:text-primary">
            Generate
          </Link>
          <Link href="/search" className="text-sm font-medium transition-colors hover:text-primary">
            <Search className="h-5 w-5" />
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/my-gallery" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>My Gallery</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/upload" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/generate" className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    <span>Generate</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
