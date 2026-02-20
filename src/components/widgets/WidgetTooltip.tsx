'use client'

import { Info } from 'lucide-react'
import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WidgetConfig } from '@/types/widget'

interface WidgetTooltipProps {
  filters: Pick<WidgetConfig, 'agencies' | 'themes'>
  agencyNames?: Record<string, string>
  themeNames?: Record<string, string>
}

export function WidgetTooltip({
  filters,
  agencyNames = {},
  themeNames = {},
}: WidgetTooltipProps) {
  const [open, setOpen] = useState(false)

  const hasFilters =
    (filters.agencies && filters.agencies.length > 0) ||
    (filters.themes && filters.themes.length > 0)

  if (!hasFilters) {
    return (
      <TooltipProvider>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="absolute top-2 right-2 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors"
              aria-label="Informações sobre o widget"
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">Exibindo todas as notícias recentes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors z-10"
            aria-label="Informações sobre filtros aplicados"
          >
            <Info className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Filtros aplicados:</p>

            {filters.agencies && filters.agencies.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Órgãos:
                </p>
                <ul className="text-xs space-y-0.5 mt-1">
                  {filters.agencies.map((agency) => (
                    <li key={agency}>• {agencyNames[agency] || agency}</li>
                  ))}
                </ul>
              </div>
            )}

            {filters.themes && filters.themes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Temas:
                </p>
                <ul className="text-xs space-y-0.5 mt-1">
                  {filters.themes.map((theme) => (
                    <li key={theme}>• {themeNames[theme] || theme}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
