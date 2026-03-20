'use client'

import { ExternalLink, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { AgencyMultiSelect } from '@/components/filters/AgencyMultiSelect'
import { ThemeMultiSelect } from '@/components/filters/ThemeMultiSelect'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import { buildRecortePreviewUrl } from '@/lib/recorte-preview-url'
import type { Recorte } from '@/types/clipping'
import { ArticleCountBadge } from './ArticleCountBadge'

type Props = {
  recorte: Recorte
  onChange: (recorte: Recorte) => void
  onRemove: () => void
  showRemove?: boolean
  themes: ThemeOption[]
  agencies: AgencyOption[]
  estimatedCount?: number
}

export function RecorteEditor({
  recorte,
  onChange,
  onRemove,
  showRemove = true,
  themes,
  agencies,
  estimatedCount,
}: Props) {
  const [keywordInput, setKeywordInput] = useState('')

  const handleThemesChange = useCallback(
    (themes: string[]) => {
      onChange({ ...recorte, themes })
    },
    [recorte, onChange],
  )

  const handleAgenciesChange = useCallback(
    (agencies: string[]) => {
      onChange({ ...recorte, agencies })
    },
    [recorte, onChange],
  )

  const addKeyword = useCallback(() => {
    const trimmed = keywordInput.trim()
    if (trimmed && !recorte.keywords.includes(trimmed)) {
      onChange({ ...recorte, keywords: [...recorte.keywords, trimmed] })
    }
    setKeywordInput('')
  }, [keywordInput, recorte, onChange])

  const removeKeyword = useCallback(
    (kw: string) => {
      onChange({
        ...recorte,
        keywords: recorte.keywords.filter((k) => k !== kw),
      })
    },
    [recorte, onChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addKeyword()
      }
    },
    [addKeyword],
  )

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...recorte, title: e.target.value.slice(0, 100) })
    },
    [recorte, onChange],
  )

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-card">
      {estimatedCount !== undefined && (
        <div className="flex justify-end">
          <ArticleCountBadge count={estimatedCount} />
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">
          Título do recorte{' '}
          <span className="text-destructive font-normal">*</span>
        </p>
        <Input
          type="text"
          value={recorte.title ?? ''}
          onChange={handleTitleChange}
          placeholder="Ex: Educação Superior, Meio Ambiente..."
          required
          maxLength={100}
        />
      </div>

      {/* Themes */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Temas</p>
        <ThemeMultiSelect
          themes={themes}
          selectedThemes={recorte.themes}
          onSelectedThemesChange={handleThemesChange}
        />
      </div>

      {/* Agencies */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Órgãos</p>
        <AgencyMultiSelect
          agencies={agencies}
          selectedAgencies={recorte.agencies}
          onSelectedAgenciesChange={handleAgenciesChange}
        />
      </div>

      {/* Keywords */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Palavras-chave</p>
        <div className="flex gap-2">
          <Input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma palavra-chave e pressione Enter"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addKeyword}
            disabled={!keywordInput.trim()}
            className="shrink-0 cursor-pointer"
          >
            Adicionar
          </Button>
        </div>
        {recorte.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {recorte.keywords.map((kw) => (
              <Badge key={kw} className="inline-flex items-center gap-1 pr-1">
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="ml-1 hover:text-destructive transition-colors"
                  aria-label={`Remover ${kw}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Preview link */}
      {(() => {
        const previewUrl = buildRecortePreviewUrl(recorte)
        return previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver notícias que combinam com este recorte
          </a>
        ) : null
      })()}

      {/* Remove button */}
      {showRemove && (
        <div className="pt-2 border-t border-border">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
            className="cursor-pointer"
          >
            Remover Recorte
          </Button>
        </div>
      )}
    </div>
  )
}
