'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { TagFilter } from '@/components/articles/TagFilter'
import { AgencyMultiSelect } from '@/components/filters/AgencyMultiSelect'
import { EntityMultiSelect } from '@/components/filters/EntityMultiSelect'
import { ThemeMultiSelect } from '@/components/filters/ThemeMultiSelect'
import { Portal } from '@/components/layout/Portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'
import type { TagFacet } from '@/types/article'

/** Opções de sentimento expostas no filtro (valor enviado ao filter.sentiment). */
const SENTIMENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'negative', label: 'Negativo' },
]

type DateFilterProps = {
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
}

function DateFilter({ label, value, onChange }: DateFilterProps) {
  const inputId = `date-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-primary">
        {label}
      </label>
      <div className="relative">
        <Input
          id={inputId}
          type="date"
          onChange={(e) =>
            onChange(e.target.value ? new Date(e.target.value) : undefined)
          }
          className={value ? 'pr-9' : undefined}
          value={
            value && !isNaN(value.getTime())
              ? value.toISOString().split('T')[0]
              : ''
          }
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(undefined)}
            aria-label="Limpar data"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

type TooltipProps = {
  content: string
  children: React.ReactNode
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      })
    }
  }, [isVisible])

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        role="tooltip"
      >
        {children}
      </div>
      {isVisible && (
        <Portal>
          <div
            className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-[9999] pointer-events-none -translate-y-1/2"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
            {content}
          </div>
        </Portal>
      )}
    </>
  )
}

type ArticleFiltersProps = {
  agencies?: AgencyOption[]
  themes?: ThemeOption[]
  popularTags?: TagFacet[]
  startDate: Date | undefined
  endDate: Date | undefined
  selectedAgencies?: string[]
  selectedThemes?: string[]
  selectedTags?: string[]
  selectedSentiments?: string[]
  selectedEntities?: string[]
  onStartDateChange: (date: Date | undefined) => void
  onEndDateChange: (date: Date | undefined) => void
  onAgenciesChange?: (agencies: string[]) => void
  onThemesChange?: (themes: string[]) => void
  onTagsChange?: (tags: string[]) => void
  onSentimentsChange?: (sentiments: string[]) => void
  onEntitiesChange?: (entities: string[]) => void
  getAgencyName?: (key: string) => string
  getThemeName?: (key: string) => string
  getThemeHierarchyPath?: (key: string) => string
  showAgencyFilter?: boolean
  showThemeFilter?: boolean
  showTagFilter?: boolean
  showSentimentFilter?: boolean
  showEntityFilter?: boolean
}

export function ArticleFilters({
  agencies = [],
  themes = [],
  popularTags = [],
  startDate,
  endDate,
  selectedAgencies = [],
  selectedThemes = [],
  selectedTags = [],
  selectedSentiments = [],
  selectedEntities = [],
  onStartDateChange,
  onEndDateChange,
  onAgenciesChange,
  onThemesChange,
  onTagsChange,
  onSentimentsChange,
  onEntitiesChange,
  getAgencyName,
  getThemeName,
  getThemeHierarchyPath,
  showAgencyFilter = true,
  showThemeFilter = true,
  showTagFilter = true,
  showSentimentFilter = false,
  showEntityFilter = false,
}: ArticleFiltersProps) {
  const toggleSentiment = (value: string) => {
    if (!onSentimentsChange) return
    onSentimentsChange(
      selectedSentiments.includes(value)
        ? selectedSentiments.filter((s) => s !== value)
        : [...selectedSentiments, value],
    )
  }
  return (
    <aside className="lg:w-80 flex-shrink-0 lg:border-r lg:border-border lg:pr-8 relative z-[98]">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-6">Filtros</h3>

        <div className="space-y-6">
          <DateFilter
            label="Início da publicação"
            value={startDate}
            onChange={onStartDateChange}
          />

          <DateFilter
            label="Fim da publicação"
            value={endDate}
            onChange={onEndDateChange}
          />

          {/* Agency Filter */}
          {showAgencyFilter && onAgenciesChange && getAgencyName && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-primary">
                  Órgãos
                </span>
                <AgencyMultiSelect
                  agencies={agencies}
                  selectedAgencies={selectedAgencies}
                  onSelectedAgenciesChange={onAgenciesChange}
                />
              </div>

              {/* Selected Agencies List */}
              {selectedAgencies.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-primary">
                      Órgãos selecionados ({selectedAgencies.length})
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => onAgenciesChange([])}
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                    >
                      Limpar todos
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedAgencies.map((key) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-md text-sm hover:bg-primary/10 transition-colors group"
                      >
                        <span className="truncate text-primary/90 flex-1 min-w-0">
                          {getAgencyName(key)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onAgenciesChange(
                              selectedAgencies.filter((k) => k !== key),
                            )
                          }
                          className="h-6 w-6 p-0 text-primary/50 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          aria-label={`Remover ${getAgencyName(key)}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Theme Filter */}
          {showThemeFilter && onThemesChange && getThemeName && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-primary">
                  Temas
                </span>
                <ThemeMultiSelect
                  themes={themes}
                  selectedThemes={selectedThemes}
                  onSelectedThemesChange={onThemesChange}
                />
              </div>

              {/* Selected Themes List */}
              {selectedThemes.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-primary">
                      Temas selecionados ({selectedThemes.length})
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => onThemesChange([])}
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                    >
                      Limpar todos
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedThemes.map((key) => (
                      <Tooltip
                        key={key}
                        content={
                          getThemeHierarchyPath
                            ? getThemeHierarchyPath(key)
                            : getThemeName(key)
                        }
                      >
                        <div
                          className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-md text-sm hover:bg-primary/10 transition-colors group"
                          title=""
                        >
                          <span
                            className="text-primary/90 flex-1 min-w-0 overflow-hidden line-clamp-1"
                            style={{ textOverflow: 'clip' }}
                            title=""
                          >
                            {getThemeName(key)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              onThemesChange(
                                selectedThemes.filter((k) => k !== key),
                              )
                            }
                            className="h-6 w-6 p-0 text-primary/50 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            aria-label={`Remover ${getThemeName(key)}`}
                            title=""
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tag Filter */}
          {showTagFilter && onTagsChange && popularTags.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-primary">Tags</span>
              <TagFilter
                popularTags={popularTags}
                selectedTags={selectedTags}
                onSelectedTagsChange={onTagsChange}
              />
            </div>
          )}

          {/* Sentiment Filter */}
          {showSentimentFilter && onSentimentsChange && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-primary">
                Sentimento
              </span>
              <div className="flex flex-wrap gap-2">
                {SENTIMENT_OPTIONS.map((option) => {
                  const active = selectedSentiments.includes(option.value)
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleSentiment(option.value)}
                      className="rounded-full"
                      aria-pressed={active}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Entity Filter (typeahead — depende da Fase 0 para retornar dados) */}
          {showEntityFilter && onEntitiesChange && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-primary">
                  Entidades
                </span>
                <EntityMultiSelect
                  selectedEntities={selectedEntities}
                  onSelectedEntitiesChange={onEntitiesChange}
                />
              </div>

              {/* Selected Entities List */}
              {selectedEntities.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-primary">
                      Entidades selecionadas ({selectedEntities.length})
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => onEntitiesChange([])}
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                    >
                      Limpar todas
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedEntities.map((value) => (
                      <div
                        key={value}
                        className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-md text-sm hover:bg-primary/10 transition-colors group"
                      >
                        <span className="truncate text-primary/90 flex-1 min-w-0">
                          {value}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onEntitiesChange(
                              selectedEntities.filter((v) => v !== value),
                            )
                          }
                          className="h-6 w-6 p-0 text-primary/50 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          aria-label={`Remover ${value}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
