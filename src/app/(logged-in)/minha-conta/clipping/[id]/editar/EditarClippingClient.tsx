'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ClippingWizard } from '@/components/clipping/ClippingWizard'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import type { Clipping, ClippingPayload } from '@/types/clipping'

type Props = {
  id: string
  agencies: AgencyOption[]
  themes: ThemeOption[]
  hasTelegram: boolean
}

export function EditarClippingClient({
  id,
  agencies,
  themes,
  hasTelegram,
}: Props) {
  const router = useRouter()
  const [clipping, setClipping] = useState<Clipping | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clipping')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: Clipping[]) => {
        const found = data.find((c) => c.id === id)
        if (!found) {
          setError('Clipping não encontrado.')
        } else {
          setClipping(found)
        }
      })
      .catch(() => setError('Erro ao carregar o clipping.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (data: ClippingPayload) => {
    const res = await fetch(`/api/clipping/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      throw new Error('Falha ao atualizar clipping')
    }

    router.push('/minha-conta/clipping')
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </main>
    )
  }

  if (error || !clipping) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <p className="text-destructive">
          {error ?? 'Clipping não encontrado.'}
        </p>
      </main>
    )
  }

  const initialData: ClippingPayload = {
    name: clipping.name,
    recortes: clipping.recortes,
    prompt: clipping.prompt,
    scheduleTime: clipping.scheduleTime,
    deliveryChannels: clipping.deliveryChannels,
    active: clipping.active,
    extraEmails: clipping.extraEmails ?? [],
    webhookUrl: clipping.webhookUrl ?? '',
    includeHistory: clipping.includeHistory ?? false,
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Editar Clipping</h1>
        <p className="text-muted-foreground mt-1">
          Atualize as configurações do seu clipping.
        </p>
      </div>
      <ClippingWizard
        initialData={initialData}
        onSubmit={handleSubmit}
        themes={themes}
        agencies={agencies}
        hasTelegram={hasTelegram}
      />
    </main>
  )
}
