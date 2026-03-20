'use client'

import { Maximize2, X } from 'lucide-react'
import * as React from 'react'
import { Portal } from '@/components/layout/Portal'
import { Button } from '@/components/ui/button'

type Agency = {
  key: string
  name: string
  type: string
}

type AgencyMultiSelectProps = {
  agencies: Agency[]
  selectedAgencies: string[]
  onSelectedAgenciesChange: (agencies: string[]) => void
}

export function AgencyMultiSelect({
  agencies,
  selectedAgencies,
  onSelectedAgenciesChange,
}: AgencyMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Group and sort agencies by type
  const agenciesByType = React.useMemo(() => {
    const grouped: Record<string, Agency[]> = {}
    for (const agency of agencies) {
      if (!grouped[agency.type]) {
        grouped[agency.type] = []
      }
      grouped[agency.type].push(agency)
    }
    return grouped
  }, [agencies])

  // Filter agencies by search term
  const { filteredAgenciesByType, filteredTypes } = React.useMemo(() => {
    let result = agenciesByType

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const filtered: Record<string, Agency[]> = {}

      for (const [type, typeAgencies] of Object.entries(agenciesByType)) {
        const matchingAgencies = typeAgencies.filter((agency) =>
          agency.name.toLowerCase().includes(searchLower),
        )
        if (matchingAgencies.length > 0) {
          filtered[type] = matchingAgencies
        }
      }
      result = filtered
    }

    // Custom sort: Ministérios first, then Agências, then alphabetically
    const sortedTypes = Object.keys(result).sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()

      // Check if they start with "ministério" or "agência"
      const aIsMinistry = aLower.startsWith('ministério')
      const bIsMinistry = bLower.startsWith('ministério')
      const aIsAgency = aLower.startsWith('agência')
      const bIsAgency = bLower.startsWith('agência')

      // Ministérios come first
      if (aIsMinistry && !bIsMinistry) return -1
      if (!aIsMinistry && bIsMinistry) return 1

      // Then Agências
      if (aIsAgency && !bIsAgency && !bIsMinistry) return -1
      if (!aIsAgency && bIsAgency && !aIsMinistry) return 1

      // Otherwise alphabetical
      return a.localeCompare(b, 'pt-BR')
    })

    return {
      filteredAgenciesByType: result,
      filteredTypes: sortedTypes,
    }
  }, [searchTerm, agenciesByType])

  const toggleAgency = React.useCallback(
    (agencyKey: string) => {
      onSelectedAgenciesChange(
        selectedAgencies.includes(agencyKey)
          ? selectedAgencies.filter((key) => key !== agencyKey)
          : [...selectedAgencies, agencyKey],
      )
    },
    [selectedAgencies, onSelectedAgenciesChange],
  )

  const _getAgencyName = React.useCallback(
    (key: string) => {
      const agency = agencies.find((a) => a.key === key)
      return agency?.name || key
    },
    [agencies],
  )

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  // Close modal on ESC key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false)
        } else if (isOpen) {
          setIsOpen(false)
        }
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isExpanded, isOpen])

  // Render agency list (reusable for both dropdown and modal)
  const renderAgencyList = () => (
    <>
      {filteredTypes.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          Nenhum órgão encontrado
        </div>
      ) : (
        filteredTypes.map((type) => (
          <div key={type} className="mb-2">
            <div className="text-xs font-semibold text-primary uppercase tracking-wide px-3 py-2 bg-muted/50 rounded-sm">
              {type}
            </div>
            <div className="mt-1">
              {filteredAgenciesByType[type].map((agency) => (
                <label
                  key={agency.key}
                  className="flex items-center px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={selectedAgencies.includes(agency.key)}
                    onChange={() => toggleAgency(agency.key)}
                    className="mr-3 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="truncate text-sm group-hover:font-medium transition-all">
                    {agency.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )

  return (
    <div
      className={`relative w-full ${isOpen ? 'z-[9999]' : ''}`}
      ref={dropdownRef}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 py-2 border border-input rounded-md text-left text-sm bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span
          className={
            selectedAgencies.length === 0
              ? 'text-muted-foreground'
              : 'text-foreground'
          }
        >
          {selectedAgencies.length === 0
            ? 'Selecione órgãos...'
            : `${selectedAgencies.length} selecionado${selectedAgencies.length > 1 ? 's' : ''}`}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[320px] bg-white border border-border rounded-md shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
          {/* Search and Expand Button */}
          <div className="p-3 border-b border-border flex gap-2">
            <input
              type="text"
              placeholder="Buscar órgãos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            <button
              type="button"
              onClick={() => {
                setIsExpanded(true)
                setIsOpen(false)
              }}
              className="px-3 py-2 border border-input rounded-md hover:bg-gray-50 transition-colors"
              title="Expandir visualização"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {renderAgencyList()}
          </div>
        </div>
      )}

      {/* Expanded Modal */}
      {isExpanded && (
        <Portal>
          <button
            type="button"
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 animate-in fade-in-0 p-4 pointer-events-auto border-0"
            onClick={() => setIsExpanded(false)}
            aria-label="Fechar modal"
          >
            <div
              className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in zoom-in-95 relative z-[301]"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="agency-select-title"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2
                  id="agency-select-title"
                  className="text-xl font-semibold text-primary"
                >
                  Selecionar Órgãos
                </h2>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Modal Search */}
              <div className="p-6 border-b border-border">
                <input
                  type="text"
                  placeholder="Buscar órgãos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderAgencyList()}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border flex items-center justify-between bg-gray-50">
                <span className="text-sm text-muted-foreground">
                  {selectedAgencies.length} órgão
                  {selectedAgencies.length !== 1 ? 's' : ''} selecionado
                  {selectedAgencies.length !== 1 ? 's' : ''}
                </span>
                <Button type="button" onClick={() => setIsExpanded(false)}>
                  Confirmar
                </Button>
              </div>
            </div>
          </button>
        </Portal>
      )}
    </div>
  )
}
