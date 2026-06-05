'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ClippingWizard } from '@/components/clipping/ClippingWizard'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import { useClippingService } from '@/services/clipping'
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
  const clippingService = useClippingService()
  const [clipping, setClipping] = useState<Clipping | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Reseta o estado a cada fetch. Crucial durante a migração GraphQL: no
    // 1º render a flag `graphql.clippings` ainda não resolveu, então
    // `useClippingService()` devolve o serviço REST (lê a coleção legada) e
    // pode setar erro "Clipping não encontrado". Quando a flag resolve, o
    // `clippingService` muda → este efeito re-roda via GraphQL. Sem limpar
    // `error`/`loading` aqui, o erro da tentativa REST persistia e mascarava
    // o sucesso do re-fetch (false-green do flag-race).
    setLoading(true)
    setError(null)
    clippingService
      .listClippings()
      .then((data) => {
        if (cancelled) return
        const found = data.find((c) => c.id === id)
        if (!found) {
          setError('Clipping não encontrado.')
        } else {
          setClipping(found)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Erro ao carregar o clipping.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, clippingService])

  const handleSubmit = async (data: ClippingPayload) => {
    await clippingService.updateClipping(id, data)
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
    schedule: clipping.schedule,
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
