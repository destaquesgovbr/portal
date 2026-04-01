'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Recorte } from '@/types/clipping'

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
  const [result, setResult] = useState<AgentResult | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Descreva os assuntos que deseja acompanhar.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/clipping/generate-recortes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao gerar recortes')
      }

      const data: AgentResult = await response.json()

      const recortesWithIds = data.recortes.map((r) => ({
        ...r,
        id: crypto.randomUUID?.() ?? `recorte-${Date.now()}-${Math.random()}`,
      }))

      setResult({ ...data, recortes: recortesWithIds })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (result) {
      onRecortesGenerated(
        result.recortes,
        result.suggested_name,
        result.explanation,
      )
    }
  }

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
            Analisando temas e órgãos...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Recortes com IA
          </>
        )}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Recortes gerados ({result.recortes.length})
            </h3>
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
