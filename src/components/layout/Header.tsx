'use client'

import { Search, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { AuthButton } from '@/components/auth/AuthButton'
import PushSubscriber from '@/components/push/PushSubscriber'
import SearchBar from '@/components/search/SearchBar'
import { Button } from '@/components/ui/button'

const routeLinks = [
  { href: '/artigos', label: 'Notícias' },
  { href: '/temas', label: 'Temas' },
  { href: '/orgaos', label: 'Órgãos' },
  { href: '/dados-editoriais', label: 'Dados' },
]

const themeLinks = [
  {
    href: '/temas/Meio%20Ambiente%20e%20Sustentabilidade',
    label: 'Meio ambiente',
  },
  { href: '/temas/Economia%20e%20Finan%C3%A7as', label: 'Economia' },
  { href: '/temas/Seguran%C3%A7a%20P%C3%BAblica', label: 'Segurança' },
]

const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input when overlay opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      // Use requestAnimationFrame for immediate focus after render
      requestAnimationFrame(() => {
        searchInputRef.current?.querySelector('input')?.focus()
      })
    }
  }, [searchOpen])

  // Close search on Escape key (empty deps - listener added once)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-[99] border-b bg-card shadow-card">
      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 md:h-20">
          {/* Logo - far left */}
          <Link
            href="/"
            className="flex items-center space-x-2 md:space-x-3 hover:bg-gray-200 rounded-2xl hover:cursor-pointer pr-2 md:pr-3 shrink-0"
          >
            <Image
              src="/logo.png"
              alt="Selo do Governo Federal"
              width={100}
              height={100}
              className="h-10 w-10 md:h-14 md:w-14"
            />
            <div>
              <h1 className="text-sm md:text-lg font-bold leading-tight">
                DestaquesGovBr
              </h1>
              <p className="text-xs text-muted-foreground">Governo Federal</p>
            </div>
          </Link>

          {/* Desktop search bar - centered, 60% width */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <Suspense>
              <div className="w-[60%] max-w-2xl">
                <SearchBar />
              </div>
            </Suspense>
          </div>

          {/* Desktop push + auth - right side */}
          <div className="hidden md:flex shrink-0 items-center gap-1">
            <PushSubscriber />
            <AuthButton />
          </div>

          {/* Mobile icons - right side */}
          <div className="flex md:hidden ml-auto items-center gap-1">
            <PushSubscriber />
            <AuthButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="h-10 w-10"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-t bg-background">
        <div className="container mx-auto px-4">
          {/* Desktop nav - centered */}
          <nav className="hidden md:flex items-center justify-center py-1.5">
            {/* Routes */}
            {routeLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}

            {/* Vertical divider */}
            <div className="h-4 w-px bg-border mx-2" />

            {/* Themes */}
            {themeLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile nav - horizontal scrolling badges */}
          <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <nav className="flex items-center gap-2 py-2 w-max">
              {/* Routes */}
              {routeLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium rounded-full px-3 py-1.5 bg-muted hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}

              {/* Vertical divider */}
              <div className="h-4 w-px bg-border" />

              {/* Themes */}
              {themeLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium rounded-full px-3 py-1.5 bg-muted hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="absolute inset-0 bg-card z-50 md:hidden">
          <div className="flex items-center h-full px-4 gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(false)}
              className="shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="flex-1" ref={searchInputRef}>
              <Suspense>
                <SearchBar />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
