'use client'

import { ChevronDown, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AGENCY_TYPE_GROUPS } from '@/data/agency-groups'

type Agency = { key: string; name: string; type: string }

interface AgencyGroupedSelectProps {
  agencies: Agency[]
  selectedAgencies: string[]
  onSelectedAgenciesChange: (keys: string[]) => void
}

function groupAgencies(agencies: Agency[]) {
  const allMatchedTypes = new Set<string>()
  const groups: { label: string; agencies: Agency[] }[] = []

  for (const group of AGENCY_TYPE_GROUPS) {
    if (group.types === null) continue
    const matched = agencies.filter((a) => group.types!.includes(a.type))
    if (matched.length > 0) {
      groups.push({
        label: group.label,
        agencies: matched.sort((a, b) => a.name.localeCompare(b.name)),
      })
      for (const t of group.types) allMatchedTypes.add(t)
    }
  }

  // Catch-all for types not in any named group
  const others = agencies.filter((a) => !allMatchedTypes.has(a.type))
  if (others.length > 0) {
    groups.push({
      label: 'Outros Órgãos',
      agencies: others.sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  return groups
}

export function AgencyGroupedSelect({
  agencies,
  selectedAgencies,
  onSelectedAgenciesChange,
}: AgencyGroupedSelectProps) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const selectedSet = useMemo(
    () => new Set(selectedAgencies),
    [selectedAgencies],
  )

  const groups = useMemo(() => groupAgencies(agencies), [agencies])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        agencies: g.agencies.filter(
          (a) =>
            a.name.toLowerCase().includes(q) || a.key.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.agencies.length > 0)
  }, [groups, search])

  function toggle(key: string) {
    if (selectedSet.has(key)) {
      onSelectedAgenciesChange(selectedAgencies.filter((k) => k !== key))
    } else {
      onSelectedAgenciesChange([...selectedAgencies, key])
    }
  }

  function toggleGroup(groupAgencies: Agency[]) {
    const allSelected = groupAgencies.every((a) => selectedSet.has(a.key))
    if (allSelected) {
      const keysToRemove = new Set(groupAgencies.map((a) => a.key))
      onSelectedAgenciesChange(
        selectedAgencies.filter((k) => !keysToRemove.has(k)),
      )
    } else {
      const keysToAdd = groupAgencies
        .filter((a) => !selectedSet.has(a.key))
        .map((a) => a.key)
      onSelectedAgenciesChange([...selectedAgencies, ...keysToAdd])
    }
  }

  function toggleCollapse(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar órgão..."
          className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-1">
        {filteredGroups.map((group) => {
          const selectedInGroup = group.agencies.filter((a) =>
            selectedSet.has(a.key),
          ).length
          const isCollapsed = collapsed[group.label] ?? false

          return (
            <div key={group.label} className="border rounded-md">
              <button
                type="button"
                onClick={() => toggleCollapse(group.label)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                  {group.label}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({group.agencies.length})
                  </span>
                </span>
                {selectedInGroup > 0 && (
                  <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5">
                    {selectedInGroup}
                  </span>
                )}
              </button>

              {!isCollapsed && (
                <div className="px-3 pb-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.agencies)}
                    className="text-xs text-primary hover:underline mb-1"
                  >
                    {group.agencies.every((a) => selectedSet.has(a.key))
                      ? 'Desmarcar todos'
                      : 'Selecionar todos'}
                  </button>
                  {group.agencies.map((agency) => (
                    <label
                      key={agency.key}
                      className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSet.has(agency.key)}
                        onChange={() => toggle(agency.key)}
                        className="h-4 w-4 rounded border-gray-300 text-primary accent-primary"
                      />
                      <span className="truncate">{agency.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {filteredGroups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum órgão encontrado.
          </p>
        )}
      </div>

      {selectedAgencies.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {selectedAgencies.length} órgão
          {selectedAgencies.length !== 1 ? 's' : ''} selecionado
          {selectedAgencies.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
