'use client'

import { ChevronDown, ChevronUp, Search, Tag, X } from 'lucide-react'
import * as React from 'react'
import type { TagFacet } from '@/types/article'

type TagFilterProps = {
  popularTags: TagFacet[]
  selectedTags: string[]
  onSelectedTagsChange: (tags: string[]) => void
}

export function TagFilter({
  popularTags,
  selectedTags,
  onSelectedTagsChange,
}: TagFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [showAll, setShowAll] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Filter tags by search term
  const filteredTags = React.useMemo(() => {
    if (!searchTerm) return popularTags
    const searchLower = searchTerm.toLowerCase()
    return popularTags.filter((tag) =>
      tag.value.toLowerCase().includes(searchLower),
    )
  }, [searchTerm, popularTags])

  // Limit displayed tags unless showAll is true
  const displayedTags = showAll ? filteredTags : filteredTags.slice(0, 20)

  const toggleTag = React.useCallback(
    (tagValue: string) => {
      onSelectedTagsChange(
        selectedTags.includes(tagValue)
          ? selectedTags.filter((t) => t !== tagValue)
          : [...selectedTags, tagValue],
      )
    },
    [selectedTags, onSelectedTagsChange],
  )

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md bg-white hover:bg-primary/5 transition-colors text-sm"
      >
        <span className="text-primary/70">
          {selectedTags.length > 0
            ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selecionada${selectedTags.length > 1 ? 's' : ''}`
            : 'Selecionar tags'}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-primary/50" />
        ) : (
          <ChevronDown className="w-4 h-4 text-primary/50" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
              <input
                type="text"
                placeholder="Buscar tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Tags list */}
          <div className="overflow-y-auto max-h-52 p-2">
            {displayedTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {displayedTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.value)
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleTag(tag.value)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-primary/5 text-primary/80 hover:bg-primary/10'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">
                        {tag.value}
                      </span>
                      <span className="text-[10px] opacity-70">
                        ({tag.count})
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-primary/50 text-center py-4">
                Nenhuma tag encontrada
              </p>
            )}
          </div>

          {/* Show more/less button */}
          {filteredTags.length > 20 && (
            <div className="p-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="w-full text-xs text-primary/70 hover:text-primary"
              >
                {showAll
                  ? 'Mostrar menos'
                  : `Ver todas (${filteredTags.length} tags)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected tags badges */}
      {selectedTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
            >
              <Tag className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{tag}</span>
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="hover:text-red-600 transition-colors"
                aria-label={`Remover ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
