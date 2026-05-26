'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ClippingWizard } from '@/components/clipping/ClippingWizard'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import { useClippingService } from '@/services/clipping'
import type { ClippingPayload } from '@/types/clipping'

type Props = {
  agencies: AgencyOption[]
  themes: ThemeOption[]
  hasTelegram: boolean
}

export function NovoClippingClient({ agencies, themes, hasTelegram }: Props) {
  const router = useRouter()
  const clippingService = useClippingService()

  const handleSubmit = async (data: ClippingPayload) => {
    await clippingService.createClipping(data)

    toast.success('Clipping criado! Seu primeiro envio está sendo gerado.', {
      description:
        'Use "Gerar e Enviar Agora" a qualquer momento para receber um clipping atualizado.',
      duration: 8000,
    })
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
