'use client'

import { Loader2, Plus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import { useRecorteEstimation } from '@/hooks/useRecorteEstimation'
import { MAX_DAILY_ARTICLES } from '@/lib/estimate-recorte-count'
import { urlBase64ToUint8Array } from '@/lib/push-utils'
import type {
  ClippingPayload,
  DeliveryChannels,
  Recorte,
} from '@/types/clipping'
import { ChannelSelector } from './ChannelSelector'
import {
  CronScheduleBuilder,
  type CronScheduleValue,
} from './CronScheduleBuilder'
import { PromptEditor } from './PromptEditor'
import { RecorteEditor } from './RecorteEditor'

// NOTE: this prompt must be kept in sync with clipping worker consolidator.py DEFAULT_PROMPT
const DEFAULT_PROMPT = `Consolide os artigos a seguir em um digest editorial para o clipping "{clipping_name}".

Diretrizes:
- Identifique os fios narrativos mais relevantes e agrupe os artigos por eles
- Crie manchetes editoriais que revelem o significado, não que descrevam o fato
- Nos resumos, cruze informações entre fontes e destaque implicações práticas
- Use <em> para enfatizar datas, valores e fatos-chave
- Inclua uma intro contextualizando os temas dominantes do período

Artigos:
{articles}`

let _recorteCounter = 0
function createRecorte(): Recorte {
  _recorteCounter += 1
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `recorte-${_recorteCounter}-${Date.now()}`
  return {
    id,
    title: '',
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
  themes: ThemeOption[]
  agencies: AgencyOption[]
  hasTelegram?: boolean
}

const SHOW_PROMPT_STEP = process.env.NEXT_PUBLIC_SHOW_PROMPT_STEP === 'true'
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const PUSH_WORKER_URL = process.env.NEXT_PUBLIC_PUSH_WORKER_URL || ''

const STEPS = SHOW_PROMPT_STEP
  ? (['Recortes', 'Prompt', 'Agendamento', 'Canais'] as const)
  : (['Recortes', 'Agendamento', 'Canais'] as const)

export function ClippingWizard({
  initialData,
  onSubmit,
  themes,
  agencies,
  hasTelegram = false,
}: Props) {
  const { data: session } = useSession()
  const isEditing = !!initialData
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [recortes, setRecortes] = useState<Recorte[]>(
    initialData?.recortes?.length ? initialData.recortes : [createRecorte()],
  )
  const [prompt, setPrompt] = useState(initialData?.prompt ?? DEFAULT_PROMPT)
  const [cronValue, setCronValue] = useState<CronScheduleValue>({
    schedule: initialData?.schedule ?? '0 8 * * *',
    startDate: initialData?.startDate ?? null,
    endDate: initialData?.endDate ?? null,
  })
  const [deliveryChannels, setDeliveryChannels] = useState<DeliveryChannels>(
    initialData?.deliveryChannels ?? {
      email: false,
      telegram: false,
      push: false,
      webhook: false,
    },
  )
  const [extraEmails, setExtraEmails] = useState<string[]>(
    initialData?.extraEmails ?? [],
  )
  const [webhookUrl, setWebhookUrl] = useState(initialData?.webhookUrl ?? '')
  const [includeHistory, setIncludeHistory] = useState(
    initialData?.includeHistory ?? false,
  )

  const {
    total: estimatedTotal,
    perRecorte: estimatedPerRecorte,
    loading: estimationLoading,
  } = useRecorteEstimation(recortes)

  const addRecorte = useCallback(() => {
    setRecortes((prev) => [...prev, createRecorte()])
  }, [])

  const updateRecorte = useCallback((index: number, updated: Recorte) => {
    setRecortes((prev) => prev.map((r, i) => (i === index ? updated : r)))
  }, [])

  const removeRecorte = useCallback((index: number) => {
    setRecortes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const currentStepLabel = STEPS[step]

  const validateStep = useCallback((): string | null => {
    if (currentStepLabel === 'Recortes') {
      if (!name.trim()) return 'Dê um nome ao seu clipping.'
      if (recortes.length === 0) return 'Adicione ao menos um recorte.'
      if (!recortes.some(hasAnyFilter))
        return 'Cada recorte precisa ter ao menos um filtro (tema, órgão ou palavra-chave).'
      if (recortes.some((r) => !r.title.trim()))
        return 'Cada recorte precisa ter um título.'
      if (estimatedTotal > MAX_DAILY_ARTICLES)
        return `Seus recortes retornam ~${estimatedTotal} notícias/dia. O limite é ${MAX_DAILY_ARTICLES}.`
    }
    if (currentStepLabel === 'Canais') {
      const anyEnabled =
        deliveryChannels.email ||
        deliveryChannels.telegram ||
        deliveryChannels.push ||
        deliveryChannels.webhook
      if (!anyEnabled) return 'Selecione ao menos um canal de entrega.'
    }
    return null
  }, [currentStepLabel, name, recortes, deliveryChannels, estimatedTotal])

  const handleNext = useCallback(() => {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    if (step < STEPS.length - 1) setStep((prev) => prev + 1)
  }, [step, validateStep])

  const handleBack = useCallback(() => {
    setError(null)
    if (step > 0) setStep((prev) => prev - 1)
  }, [step])

  const validateAll = useCallback((): string | null => {
    if (!name.trim()) return 'Dê um nome ao seu clipping.'
    if (recortes.length === 0) return 'Adicione ao menos um recorte.'
    if (!recortes.some(hasAnyFilter))
      return 'Cada recorte precisa ter ao menos um filtro (tema, órgão ou palavra-chave).'
    if (recortes.some((r) => !r.title.trim()))
      return 'Cada recorte precisa ter um título.'
    if (estimatedTotal > MAX_DAILY_ARTICLES)
      return `Seus recortes retornam ~${estimatedTotal} notícias/dia. O limite é ${MAX_DAILY_ARTICLES}.`
    const anyChannel =
      deliveryChannels.email ||
      deliveryChannels.telegram ||
      deliveryChannels.push ||
      deliveryChannels.webhook
    if (!anyChannel) return 'Selecione ao menos um canal de entrega.'
    return null
  }, [name, recortes, deliveryChannels, estimatedTotal])

  const ensurePushSubscription = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      throw new Error('Seu navegador não suporta notificações push.')
    }
    if (!VAPID_PUBLIC_KEY || !PUSH_WORKER_URL) {
      throw new Error('Notificações push não estão configuradas no servidor.')
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      throw new Error(
        'Permissão de notificação negada. Ative nas configurações do navegador.',
      )
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const sub = subscription.toJSON()
    const response = await fetch(`${PUSH_WORKER_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: sub.keys,
        filters: [],
        user_id: session?.user?.id ?? null,
      }),
    })

    if (!response.ok) {
      throw new Error('Falha ao registrar notificação push no servidor.')
    }
  }, [session])

  const handleConfirm = useCallback(async () => {
    const err = isEditing ? validateAll() : validateStep()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setLoading(true)
    try {
      // Request push permission and register subscription if push is enabled
      if (deliveryChannels.push) {
        try {
          await ensurePushSubscription()
        } catch (pushErr) {
          setError(
            pushErr instanceof Error
              ? pushErr.message
              : 'Erro ao ativar notificações push.',
          )
          setLoading(false)
          return
        }
      }

      await onSubmit({
        name,
        description: description || undefined,
        recortes,
        prompt: SHOW_PROMPT_STEP ? prompt : '',
        schedule: cronValue.schedule,
        startDate: cronValue.startDate,
        endDate: cronValue.endDate,
        deliveryChannels,
        active: initialData?.active ?? true,
        extraEmails,
        webhookUrl,
        includeHistory: SHOW_PROMPT_STEP ? includeHistory : false,
      })
    } finally {
      setLoading(false)
    }
  }, [
    isEditing,
    validateAll,
    validateStep,
    ensurePushSubscription,
    onSubmit,
    name,
    description,
    recortes,
    prompt,
    cronValue,
    deliveryChannels,
    initialData?.active,
    extraEmails,
    webhookUrl,
    includeHistory,
  ])

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => isEditing && setStep(i)}
                disabled={!isEditing}
                className={`flex items-center gap-2 transition-colors ${isEditing ? 'cursor-pointer' : ''}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                        : 'bg-muted text-muted-foreground'
                  } ${isEditing ? 'group-hover:ring-2 group-hover:ring-primary/50' : ''}`}
                >
                  {i + 1}
                </span>
                <span
                  className={`hidden sm:inline text-sm ${i === step ? 'font-semibold' : 'text-muted-foreground'} ${isEditing ? 'hover:text-foreground' : ''}`}
                >
                  {label}
                </span>
              </button>
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
        {/* Step: Recortes */}
        {currentStepLabel === 'Recortes' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Recortes</h2>
            {/* Estimation summary */}
            {(estimatedTotal > 0 || estimationLoading) && (
              <div
                className={`text-sm px-3 py-2 rounded-md ${
                  estimatedTotal > MAX_DAILY_ARTICLES
                    ? 'text-destructive bg-destructive/10'
                    : estimatedTotal < 10 && estimatedTotal > 0
                      ? 'text-yellow-700 bg-yellow-50'
                      : 'text-muted-foreground bg-muted/50'
                }`}
              >
                {estimationLoading
                  ? 'Estimando notícias...'
                  : estimatedTotal > MAX_DAILY_ARTICLES
                    ? `~${estimatedTotal} notícias/dia estimadas — limite máximo é ${MAX_DAILY_ARTICLES}`
                    : estimatedTotal < 10 && estimatedTotal > 0
                      ? `~${estimatedTotal} notícias/dia estimadas — considere ampliar os filtros`
                      : `~${estimatedTotal} notícias/dia estimadas`}
              </div>
            )}
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
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="clipping-description"
              >
                Descrição{' '}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </label>
              <Textarea
                id="clipping-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Descreva o propósito do seu clipping para o marketplace"
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/500
              </p>
            </div>
            <div className="space-y-3">
              {recortes.map((recorte, index) => (
                <RecorteEditor
                  key={recorte.id}
                  recorte={recorte}
                  onChange={(updated) => updateRecorte(index, updated)}
                  onRemove={() => removeRecorte(index)}
                  showRemove={recortes.length > 1}
                  themes={themes}
                  agencies={agencies}
                  estimatedCount={estimatedPerRecorte[index]}
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

        {/* Step: Prompt (behind feature toggle) */}
        {currentStepLabel === 'Prompt' && (
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
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <input
                type="checkbox"
                id="include-history"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="include-history" className="cursor-pointer">
                <span className="text-sm font-medium">
                  Incluir histórico de edições anteriores
                </span>
                <p className="text-xs text-muted-foreground">
                  Quando ativado, edições anteriores são usadas como referência
                  para criar continuidade narrativa entre os resumos.
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Step: Horário */}
        {currentStepLabel === 'Agendamento' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Agendamento</h2>
            <p className="text-sm text-muted-foreground">
              Configure a frequência e o horário de envio do seu clipping.
            </p>
            <CronScheduleBuilder value={cronValue} onChange={setCronValue} />
          </div>
        )}

        {/* Step: Canais */}
        {currentStepLabel === 'Canais' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Canais de entrega</h2>
            <ChannelSelector
              value={deliveryChannels}
              onChange={setDeliveryChannels}
              hasTelegram={hasTelegram}
              extraEmails={extraEmails}
              onExtraEmailsChange={setExtraEmails}
              webhookUrl={webhookUrl}
              onWebhookUrlChange={setWebhookUrl}
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

        <div className="flex items-center gap-2">
          {isEditing && step < STEPS.length - 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleConfirm}
              disabled={loading}
              className="cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          )}

          {step < STEPS.length - 1 ? (
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
              {isEditing ? 'Salvar' : 'Confirmar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
