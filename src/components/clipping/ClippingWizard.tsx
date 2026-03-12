'use client'

import { Loader2, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import type {
  ClippingPayload,
  DeliveryChannels,
  Recorte,
} from '@/types/clipping'
import { ChannelSelector } from './ChannelSelector'
import { PromptEditor } from './PromptEditor'
import { RecorteEditor } from './RecorteEditor'
import { ScheduleSelect } from './ScheduleSelect'

const DEFAULT_PROMPT = `Você é um assistente que consolida notícias do governo brasileiro.
A seguir estão artigos publicados nas últimas horas para o clipping "{clipping_name}".
Faça um resumo executivo em português, estruturado por tópico, destacando pontos de atenção e decisões relevantes.
Seja conciso (máximo 400 palavras). Use bullet points por tema. Inclua a fonte (órgão) de cada ponto.`

let _recorteCounter = 0
function createRecorte(): Recorte {
  _recorteCounter += 1
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `recorte-${_recorteCounter}-${Date.now()}`
  return {
    id,
    themes: [],
    agencies: [],
    keywords: [],
  }
}

function hasAnyFilter(recorte: Recorte): boolean {
  return (
    recorte.themes.length > 0 ||
    recorte.agencies.length > 0 ||
    recorte.keywords.length > 0
  )
}

type Props = {
  initialData?: ClippingPayload
  onSubmit: (data: ClippingPayload) => Promise<void>
}

const STEPS = ['Recortes', 'Prompt', 'Horário', 'Canais'] as const
type Step = 0 | 1 | 2 | 3

export function ClippingWizard({ initialData, onSubmit }: Props) {
  const [step, setStep] = useState<Step>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialData?.name ?? '')
  const [recortes, setRecortes] = useState<Recorte[]>(
    initialData?.recortes?.length ? initialData.recortes : [createRecorte()],
  )
  const [prompt, setPrompt] = useState(initialData?.prompt ?? DEFAULT_PROMPT)
  const [scheduleTime, setScheduleTime] = useState(
    initialData?.scheduleTime ?? '08:00',
  )
  const [deliveryChannels, setDeliveryChannels] = useState<DeliveryChannels>(
    initialData?.deliveryChannels ?? {
      email: false,
      telegram: false,
      push: false,
    },
  )

  const addRecorte = useCallback(() => {
    setRecortes((prev) => [...prev, createRecorte()])
  }, [])

  const updateRecorte = useCallback((index: number, updated: Recorte) => {
    setRecortes((prev) => prev.map((r, i) => (i === index ? updated : r)))
  }, [])

  const removeRecorte = useCallback((index: number) => {
    setRecortes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const validateStep = useCallback((): string | null => {
    if (step === 0) {
      if (!name.trim()) return 'Dê um nome ao seu clipping.'
      if (recortes.length === 0) return 'Adicione ao menos um recorte.'
      if (!recortes.some(hasAnyFilter))
        return 'Cada recorte precisa ter ao menos um filtro (tema, órgão ou palavra-chave).'
    }
    if (step === 3) {
      const anyEnabled =
        deliveryChannels.email ||
        deliveryChannels.telegram ||
        deliveryChannels.push
      if (!anyEnabled) return 'Selecione ao menos um canal de entrega.'
    }
    return null
  }, [step, name, recortes, deliveryChannels])

  const handleNext = useCallback(() => {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    if (step < 3) setStep((prev) => (prev + 1) as Step)
  }, [step, validateStep])

  const handleBack = useCallback(() => {
    setError(null)
    if (step > 0) setStep((prev) => (prev - 1) as Step)
  }, [step])

  const handleConfirm = useCallback(async () => {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        name,
        recortes,
        prompt,
        scheduleTime,
        deliveryChannels,
        active: initialData?.active ?? true,
      })
    } finally {
      setLoading(false)
    }
  }, [
    validateStep,
    onSubmit,
    name,
    recortes,
    prompt,
    scheduleTime,
    deliveryChannels,
    initialData?.active,
  ])

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`hidden sm:inline text-sm ${i === step ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block h-px w-6 bg-border" />
              )}
            </div>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">
        {/* Step 1: Recortes */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Recortes</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="clipping-name">
                Nome do Clipping
              </label>
              <input
                id="clipping-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do clipping (ex: Economia e Infraestrutura)"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-3">
              {recortes.map((recorte, index) => (
                <RecorteEditor
                  key={recorte.id}
                  recorte={recorte}
                  onChange={(updated) => updateRecorte(index, updated)}
                  onRemove={() => removeRecorte(index)}
                  showRemove={recortes.length > 1}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRecorte}
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Recorte
            </Button>
          </div>
        )}

        {/* Step 2: Prompt */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Prompt de resumo</h2>
            <p className="text-sm text-muted-foreground">
              Personalize como a IA irá resumir as notícias do seu clipping.
            </p>
            <PromptEditor
              value={prompt}
              onChange={setPrompt}
              defaultPrompt={DEFAULT_PROMPT}
            />
          </div>
        )}

        {/* Step 3: Horário */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Horário de envio</h2>
            <p className="text-sm text-muted-foreground">
              Escolha o horário em que deseja receber o resumo diário.
            </p>
            <div className="max-w-xs">
              <ScheduleSelect value={scheduleTime} onChange={setScheduleTime} />
            </div>
          </div>
        )}

        {/* Step 4: Canais */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Canais de entrega</h2>
            <ChannelSelector
              value={deliveryChannels}
              onChange={setDeliveryChannels}
              hasTelegram={false}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={step === 0 || loading}
          className="cursor-pointer"
        >
          Voltar
        </Button>

        {step < 3 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="cursor-pointer"
          >
            Próximo
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar
          </Button>
        )}
      </div>
    </div>
  )
}
