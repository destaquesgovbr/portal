'use client'

import { useQuery } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import * as React from 'react'
import { getEntitySuggestions } from '@/app/(public)/busca/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type EntityMultiSelectProps = {
  /** Textos canônicos de entidades já selecionados. */
  selectedEntities: string[]
  onSelectedEntitiesChange: (entities: string[]) => void
  /** Restringe as sugestões a um tipo (ORG/PER/LOC). Ausente = campo combinado. */
  type?: string | null
}

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

export function EntityMultiSelect({
  selectedEntities,
  onSelectedEntitiesChange,
  type = null,
}: EntityMultiSelectProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [debouncedTerm, setDebouncedTerm] = React.useState('')
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce do termo digitado antes de consultar as sugestões.
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim())
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchTerm])

  const suggestionsQ = useQuery({
    queryKey: ['entitySuggestions', debouncedTerm, type],
    queryFn: () => getEntitySuggestions(debouncedTerm, type, 10),
    enabled: debouncedTerm.length >= MIN_QUERY_LENGTH,
    staleTime: 60_000,
  })

  const suggestions = suggestionsQ.data ?? []
  const isLoading =
    debouncedTerm.length >= MIN_QUERY_LENGTH &&
    (suggestionsQ.isLoading || suggestionsQ.isFetching)

  const toggleEntity = React.useCallback(
    (value: string) => {
      onSelectedEntitiesChange(
        selectedEntities.includes(value)
          ? selectedEntities.filter((v) => v !== value)
          : [...selectedEntities, value],
      )
    },
    [selectedEntities, onSelectedEntitiesChange],
  )

  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder="Buscar entidades..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="bg-white"
        aria-label="Buscar entidades"
      />

      {debouncedTerm.length >= MIN_QUERY_LENGTH && (
        <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-border bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma entidade encontrada
            </div>
          ) : (
            <div className="p-1">
              {suggestions.map((s) => {
                const isSelected = selectedEntities.includes(s.value)
                return (
                  <Button
                    key={s.value}
                    type="button"
                    variant="ghost"
                    onClick={() => toggleEntity(s.value)}
                    className="h-auto w-full justify-between gap-2 px-3 py-2 text-left font-normal"
                    aria-pressed={isSelected}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Check
                        className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'opacity-100 text-primary' : 'opacity-0'}`}
                        aria-hidden
                      />
                      <span className="truncate">{s.value}</span>
                    </span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {s.count}
                    </span>
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
