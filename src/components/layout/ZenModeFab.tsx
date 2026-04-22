'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      role="img"
      aria-label="Sair do modo leitura"
    >
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  )
}

export function ZenModeFab() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setActive(document.body.classList.contains('zen-mode'))
    })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })
    setActive(document.body.classList.contains('zen-mode'))
    return () => observer.disconnect()
  }, [])

  if (!active) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => {
        document.body.classList.remove('zen-mode')
        try {
          localStorage.setItem('dgb-zen-mode', 'false')
        } catch {}
        setActive(false)
      }}
      className="fixed top-4 right-4 h-12 w-12 rounded-full bg-foreground/10 backdrop-blur-sm text-foreground/60 hover:bg-foreground/20 hover:text-foreground shadow-lg"
      style={{ zIndex: 9999 }}
      title="Sair do modo leitura (Alt+Z)"
      aria-label="Sair do modo leitura"
    >
      <CollapseIcon className="h-5 w-5" />
    </Button>
  )
}
