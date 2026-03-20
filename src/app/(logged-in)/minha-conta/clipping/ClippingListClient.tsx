'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ClippingCard } from '@/components/clipping/ClippingCard'
import type { Clipping } from '@/types/clipping'

type Props = {
  initialClippings: Clipping[]
  themeMap?: Record<string, string>
  agencyMap?: Record<string, string>
}

export function ClippingListClient({
  initialClippings,
  themeMap = {},
  agencyMap = {},
}: Props) {
  const [clippings, setClippings] = useState<Clipping[]>(initialClippings)

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/clipping/${id}`, { method: 'DELETE' })
      setClippings((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Failed to delete clipping:', err)
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/clipping/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      if (res.ok) {
        setClippings((prev) =>
          prev.map((c) => (c.id === id ? { ...c, active } : c)),
        )
      }
    } catch (err) {
      console.error('Failed to toggle clipping:', err)
    }
  }

  const handleSend = async (id: string) => {
    const res = await fetch(`/api/clipping/${id}/send`, { method: 'POST' })
    if (!res.ok) {
      throw new Error(`Send failed: ${res.status}`)
    }
  }

  const refreshClippings = async () => {
    try {
      const res = await fetch('/api/clipping')
      if (res.ok) {
        const data = await res.json()
        setClippings(data)
      }
    } catch (err) {
      console.error('Failed to refresh clippings:', err)
    }
  }

  if (clippings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <div className="text-6xl">📋</div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Nenhum clipping ainda</h2>
          <p className="text-muted-foreground max-w-sm">
            Crie seu primeiro clipping para receber resumos diários de notícias
            do governo personalizados para você.
          </p>
        </div>
        <Link
          href="/minha-conta/clipping/novo"
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Criar primeiro Clipping
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clippings.map((clipping) => (
        <ClippingCard
          key={clipping.id}
          clipping={clipping}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onSend={handleSend}
          onUnpublished={refreshClippings}
          themeMap={themeMap}
          agencyMap={agencyMap}
        />
      ))}
    </div>
  )
}
