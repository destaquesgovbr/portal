'use client'

import { Check, Loader2, Sparkles } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Recorte } from '@/types/clipping'

type AgentEvent =
  | { type: 'thinking'; message: string }
  | {
      type: 'tool_call'
      iteration: number
      recorte: string
      filters: { themes: string[]; agencies: string[]; keywords: string[] }
    }
  | {
      type: 'tool_result'
      iteration: number
      count: number
      top_themes: { code: string; label: string; count: number }[]
      top_agencies: { key: string; name: string; count: number }[]
    }
  | { type: 'adjusting'; message: string }
  | { type: 'done'; result: AgentResult }
  | { type: 'error'; message: string }

type AgentResult = {
  recortes: Recorte[]
  explanation: string
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

export function AgentRecorteGenerator({ onRecortesGenerated }: Props) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [result, setResult] = useState<AgentResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Descreva os assuntos que deseja acompanhar.')
      return
    }

    setLoading(true)
    setError(null)
    setEvents([])
    setResult(null)

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/clipping/generate-recortes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao gerar recortes')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Stream não disponível')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event: AgentEvent = JSON.parse(line.slice(6))
            setEvents((prev) => [...prev, event])

            if (event.type === 'done') {
              const recortesWithIds = event.result.recortes.map((r) => ({
                ...r,
                id:
                  crypto.randomUUID?.() ??
                  `recorte-${Date.now()}-${Math.random()}`,
              }))
              setResult({ ...event.result, recortes: recortesWithIds })
            }

            if (event.type === 'error') {
              setError(event.message)
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }, [prompt])

  const handleAccept = useCallback(() => {
    if (result) {
      onRecortesGenerated(
        result.recortes,
        result.suggested_name,
        result.explanation,
      )
    }
  }, [result, onRecortesGenerated])

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
        onClick={handleGenerate}
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
            const eventKey = `${event.type}-${'iteration' in event ? event.iteration : idx}`
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

          <p className="text-sm text-muted-foreground">{result.explanation}</p>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleAccept}
              className="cursor-pointer"
            >
              Usar estes recortes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
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
