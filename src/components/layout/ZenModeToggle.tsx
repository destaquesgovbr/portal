'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'dgb-zen-mode'

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      role="img"
      aria-label="Ativar modo leitura"
    >
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  )
}

function getStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function setStored(active: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(active))
  } catch {
    // private browsing
  }
}

export function ZenModeToggle() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const stored = getStored()
    setActive(stored)
    if (stored) {
      document.body.classList.add('zen-mode')
    }
  }, [])

  const toggle = useCallback(() => {
    setActive((prev) => {
      const next = !prev
      setStored(next)
      if (next) {
        document.body.classList.add('zen-mode')
      } else {
        document.body.classList.remove('zen-mode')
      }
      return next
    })
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.altKey &&
        e.key.toLowerCase() === 'z' &&
        !['INPUT', 'TEXTAREA'].includes(
          (e.target as HTMLElement)?.tagName ?? '',
        )
      ) {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return (
    <>
      {/* Header button (visible when NOT in zen mode) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="h-10 w-10 cursor-pointer"
        title="Modo leitura (Alt+Z)"
        aria-pressed={active}
        aria-label="Modo leitura"
      >
        <ExpandIcon className="h-4 w-4" />
      </Button>

      {/* FAB is rendered via ZenModeFab (placed outside header in layout) */}
    </>
  )
}
