'use client'

import { Check, Loader2, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSubscription } from 'urql'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  type AgentEventGraphQL,
  GENERATE_RECORTES_SUBSCRIPTION,
  type GenerateRecortesSubscriptionData,
  type GenerateRecortesSubscriptionVariables,
} from '@/lib/graphql/queries/agent'
import type { Recorte } from '@/types/clipping'

// ---------- Tipos locais (formato unificado da UI) ----------

type AgentEvent =
  | { type: 'thinking'; message: string }
  | {
      type: 'tool_call'
      recorte: string
      filters: { themes: string[]; agencies: string[]; keywords: string[] }
    }
  | {
      type: 'tool_result'
      count: number
      top_themes: { code: string; label: string; count: number }[]
      top_agencies: { key: string; name: string; count: number }[]
    }
  | {
      type: 'sample_result'
      count: number
      articles: { title: string; summary: string; agency_name: string }[]
    }
  | { type: 'adjusting'; message: string }
  | { type: 'done'; result: AgentResult }
  | { type: 'error'; message: string }

type AgentResult = {
  recortes: Recorte[]
  explanation: string
  description: string
  suggested_name: string
  iterations: number
  converged?: boolean
}

type Props = {
  onRecortesGenerated: (
    recortes: Recorte[],
    suggestedName: string,
    explanation: string,
  ) => void
}

// ---------- Mapeamento GraphQL -> formato unificado ----------

/**
 * Converte um `AgentEvent` GraphQL para o formato unificado da UI.
 * O payload das variantes `ToolCall` / `ToolResult` / `SampleResult` vem
 * como JSON string (decisão A6); aqui parseamos e validamos defensivamente.
 */
function mapGraphQLEventToLocal(ev: AgentEventGraphQL): AgentEvent | null {
  switch (ev.__typename) {
    case 'AgentEventThinking':
      return { type: 'thinking', message: ev.message }
    case 'AgentEventAdjusting':
      return { type: 'adjusting', message: ev.message }
    case 'AgentEventError':
      return { type: 'error', message: ev.message }
    case 'AgentEventToolCall': {
      try {
        const args = JSON.parse(ev.argsJson) as {
          recorte?: string
          filters?: {
            themes?: string[]
            agencies?: string[]
            keywords?: string[]
          }
        }
        return {
          type: 'tool_call',
          recorte: args.recorte ?? '',
          filters: {
            themes: args.filters?.themes ?? [],
            agencies: args.filters?.agencies ?? [],
            keywords: args.filters?.keywords ?? [],
          },
        }
      } catch {
        return null
      }
    }
    case 'AgentEventToolResult': {
      try {
        const result = JSON.parse(ev.resultJson) as {
          count?: number
          top_themes?: { code: string; label: string; count: number }[]
          top_agencies?: { key: string; name: string; count: number }[]
        }
        return {
          type: 'tool_result',
          count: result.count ?? 0,
          top_themes: result.top_themes ?? [],
          top_agencies: result.top_agencies ?? [],
        }
      } catch {
        return null
      }
    }
    case 'AgentEventSampleResult': {
      try {
        const payload = JSON.parse(ev.payloadJson) as {
          count?: number
          articles?: { title: string; summary: string; agency_name: string }[]
        }
        return {
          type: 'sample_result',
          count: payload.count ?? 0,
          articles: payload.articles ?? [],
        }
      } catch {
        return null
      }
    }
    case 'AgentEventDone':
      return {
        type: 'done',
        result: {
          recortes: ev.recortes,
          explanation: ev.explanation,
          description: ev.description,
          suggested_name: ev.suggestedName,
          iterations: ev.iterations,
          converged: ev.converged ?? undefined,
        },
      }
    default:
      return null
  }
}

export function AgentRecorteGenerator({ onRecortesGenerated }: Props) {
  return (
    <AgentRecorteGeneratorGraphQL onRecortesGenerated={onRecortesGenerated} />
  )
}

// ---------- Implementação GraphQL Subscription ----------

interface GraphQLSubscriptionState {
  active: boolean
  prompt: string
  unsubscribeCount: number
}

function AgentRecorteGeneratorGraphQL({ onRecortesGenerated }: Props) {
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [result, setResult] = useState<AgentResult | null>(null)
  const [subState, setSubState] = useState<GraphQLSubscriptionState>({
    active: false,
    prompt: '',
    unsubscribeCount: 0,
  })

  // Pausa a subscription enquanto não foi iniciada (active=false) e quando o
  // evento "done" / "error" chegou. Pause=true ⇒ urql não abre conexão.
  const [subResult] = useSubscription<
    GenerateRecortesSubscriptionData,
    GenerateRecortesSubscriptionData,
    GenerateRecortesSubscriptionVariables
  >({
    query: GENERATE_RECORTES_SUBSCRIPTION,
    variables: { prompt: subState.prompt },
    pause: !subState.active || !subState.prompt,
  })

  // Mapeia novos eventos do GraphQL para o formato local; consome `subResult.data`
  // sempre que muda. urql entrega 1 evento por update.
  const lastDataRef = useRef<GenerateRecortesSubscriptionData | null>(null)
  useEffect(() => {
    if (!subResult.data) return
    if (subResult.data === lastDataRef.current) return
    lastDataRef.current = subResult.data

    const ev = subResult.data.generateRecortes
    const mapped = mapGraphQLEventToLocal(ev)
    if (!mapped) return

    setEvents((prev) => [...prev, mapped])

    if (mapped.type === 'done') {
      const recortesWithIds = mapped.result.recortes.map((r) => ({
        ...r,
        id:
          typeof crypto !== 'undefined' &&
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `recorte-${Date.now()}-${Math.random()}`,
      }))
      setResult({ ...mapped.result, recortes: recortesWithIds })
      setSubState((s) => ({ ...s, active: false }))
    }

    if (mapped.type === 'error') {
      setError(mapped.message)
      setSubState((s) => ({ ...s, active: false }))
    }
  }, [subResult.data])

  // Propaga erros de transporte (ex.: rede caiu) para o UI.
  useEffect(() => {
    if (subResult.error) {
      setError(subResult.error.message)
      setSubState((s) => ({ ...s, active: false }))
    }
  }, [subResult.error])

  // Cancela a subscription quando o componente desmonta.
  useEffect(() => {
    return () => {
      setSubState((s) => ({
        active: false,
        prompt: '',
        unsubscribeCount: s.unsubscribeCount + 1,
      }))
    }
  }, [])

  const handleGenerate = useCallback(() => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      setError('Descreva os assuntos que deseja acompanhar.')
      return
    }
    setError(null)
    setEvents([])
    setResult(null)
    lastDataRef.current = null
    setSubState((s) => ({
      active: true,
      prompt: trimmed,
      unsubscribeCount: s.unsubscribeCount,
    }))
  }, [prompt])

  const handleAccept = useCallback(() => {
    if (result) {
      onRecortesGenerated(
        result.recortes,
        result.suggested_name,
        result.description || result.explanation,
      )
    }
  }, [result, onRecortesGenerated])

  const loading = subState.active && !result && !error

  return (
    <AgentRecorteGeneratorView
      prompt={prompt}
      setPrompt={setPrompt}
      loading={loading}
      error={error}
      events={events}
      result={result}
      onGenerate={handleGenerate}
      onAccept={handleAccept}
    />
  )
}

// ---------- View compartilhada (REST + GraphQL renderizam o mesmo UI) ----------

interface ViewProps {
  prompt: string
  setPrompt: (v: string) => void
  loading: boolean
  error: string | null
  events: AgentEvent[]
  result: AgentResult | null
  onGenerate: () => void
  onAccept: () => void
}

function AgentRecorteGeneratorView({
  prompt,
  setPrompt,
  loading,
  error,
  events,
  result,
  onGenerate,
  onAccept,
}: ViewProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="agent-prompt">
          Descreva os assuntos que deseja acompanhar
        </label>
        <Textarea
          id="agent-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: políticas de inteligência artificial e regulamentação de dados no governo federal"
          rows={3}
          disabled={loading}
        />
      </div>

      <Button
        type="button"
        onClick={onGenerate}
        disabled={loading || !prompt.trim()}
        className="cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Gerando recortes...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Recortes com IA
          </>
        )}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Timeline de eventos */}
      {events.length > 0 && (
        <div className="space-y-2 text-sm">
          {events.map((event, idx) => {
            const eventKey = `${event.type}-${idx}`
            const isLast = idx === events.length - 1
            return (
              <div
                key={eventKey}
                className="flex items-start gap-2 animate-in fade-in duration-300"
              >
                {event.type === 'done' ? (
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                ) : isLast && loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary mt-0.5 shrink-0" />
                ) : (
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}

                <div>
                  {event.type === 'thinking' && (
                    <span className="text-muted-foreground">
                      {event.message}
                    </span>
                  )}

                  {event.type === 'tool_call' && (
                    <span>
                      Testando: <strong>&quot;{event.recorte}&quot;</strong>
                      {event.filters.themes.length > 0 && (
                        <> — temas: {event.filters.themes.join(', ')}</>
                      )}
                      {event.filters.agencies.length > 0 && (
                        <> — órgãos: {event.filters.agencies.join(', ')}</>
                      )}
                    </span>
                  )}

                  {event.type === 'tool_result' && (
                    <div>
                      <span className="font-medium">{event.count} artigos</span>
                      {event.top_themes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {event.top_themes.slice(0, 3).map((t) => (
                            <Badge
                              key={t.code}
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {t.label} ({t.count})
                            </Badge>
                          ))}
                        </div>
                      )}
                      {event.top_agencies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {event.top_agencies.slice(0, 3).map((a) => (
                            <Badge
                              key={a.key}
                              className="text-xs bg-green-50 text-green-700 border-green-200"
                            >
                              {a.name} ({a.count})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {event.type === 'sample_result' && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground">
                        Amostra de artigos:
                      </span>
                      {event.articles.slice(0, 3).map((a) => (
                        <div
                          key={a.title}
                          className="text-xs text-muted-foreground pl-2 border-l-2 border-muted"
                        >
                          {a.title}{' '}
                          <span className="text-xs opacity-60">
                            ({a.agency_name})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {event.type === 'adjusting' && (
                    <span className="text-muted-foreground">
                      {event.message}
                    </span>
                  )}

                  {event.type === 'done' && (
                    <span className="text-green-700 font-medium">
                      Pronto! {event.result.recortes.length} recorte(s)
                      gerado(s)
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Resultado final */}
      {result && (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{result.suggested_name}</h3>
            {result.recortes.map((recorte) => (
              <div
                key={recorte.id}
                className="flex flex-wrap items-center gap-1.5 text-sm"
              >
                <span className="font-medium">{recorte.title}:</span>
                {recorte.themes.map((t) => (
                  <Badge
                    key={t}
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {t}
                  </Badge>
                ))}
                {recorte.agencies.map((a) => (
                  <Badge
                    key={a}
                    className="text-xs bg-green-50 text-green-700 border-green-200"
                  >
                    {a}
                  </Badge>
                ))}
                {recorte.keywords.map((k) => (
                  <Badge key={k} className="text-xs bg-background border">
                    {k}
                  </Badge>
                ))}
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {result.description || result.explanation}
          </p>

          <div className="flex gap-2">
            <Button type="button" onClick={onAccept} className="cursor-pointer">
              Usar estes recortes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onGenerate}
              disabled={loading}
              className="cursor-pointer"
            >
              Regenerar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
