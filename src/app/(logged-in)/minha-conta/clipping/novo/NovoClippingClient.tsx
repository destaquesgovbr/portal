'use client'

import { useRouter } from 'next/navigation'
import { ClippingWizard } from '@/components/clipping/ClippingWizard'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import type { ClippingPayload } from '@/types/clipping'

type Props = {
  agencies: AgencyOption[]
  themes: ThemeOption[]
  hasTelegram: boolean
}

export function NovoClippingClient({ agencies, themes, hasTelegram }: Props) {
  const router = useRouter()

  const handleSubmit = async (data: ClippingPayload) => {
    const res = await fetch('/api/clipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      throw new Error('Falha ao criar clipping')
    }

    router.push('/minha-conta/clipping')
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Novo Clipping</h1>
        <p className="text-muted-foreground mt-1">
          Configure seu clipping personalizado em{' '}
          {process.env.NEXT_PUBLIC_SHOW_PROMPT_STEP === 'true' ? '4' : '3'}{' '}
          passos.
        </p>
      </div>
      <ClippingWizard
        onSubmit={handleSubmit}
        themes={themes}
        agencies={agencies}
        hasTelegram={hasTelegram}
      />
    </main>
  )
}
