'use client'

import { useEffect, useState } from 'react'
import { AgencyMultiSelect } from '@/components/filters/AgencyMultiSelect'
import { ThemeMultiSelect } from '@/components/filters/ThemeMultiSelect'
import { Label } from '@/components/ui/label'

interface WidgetFiltersProps {
  selectedAgencies: string[]
  selectedThemes: string[]
  onAgenciesChange: (agencies: string[]) => void
  onThemesChange: (themes: string[]) => void
}

type Agency = {
  key: string
  name: string
  type: string
}

type Theme = {
  key: string
  name: string
}

type ThemeNode = {
  code: string
  label: string
  children?: ThemeNode[]
}

export function WidgetFilters({
  selectedAgencies,
  selectedThemes,
  onAgenciesChange,
  onThemesChange,
}: WidgetFiltersProps) {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [themeHierarchy, _setThemeHierarchy] = useState<ThemeNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch agencies and themes from API
    async function fetchData() {
      try {
        const response = await fetch('/api/widgets/config')
        const data = await response.json()
        setAgencies(data.agencies)
        setThemes(data.themes)
        // TODO: Fetch theme hierarchy if needed
      } catch (error) {
        console.error('Error fetching filter data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Órgãos (opcional, máx. 20)</Label>
        <AgencyMultiSelect
          agencies={agencies}
          selectedAgencies={selectedAgencies}
          onSelectedAgenciesChange={onAgenciesChange}
        />
        <p className="text-xs text-muted-foreground">
          Deixe vazio para mostrar notícias de todos os órgãos
        </p>
      </div>

      <div className="space-y-2">
        <Label>Temas (opcional, máx. 10)</Label>
        <ThemeMultiSelect
          themes={themes}
          selectedThemes={selectedThemes}
          onSelectedThemesChange={onThemesChange}
          themeHierarchy={themeHierarchy}
        />
        <p className="text-xs text-muted-foreground">
          Deixe vazio para mostrar notícias de todos os temas
        </p>
      </div>
    </div>
  )
}
