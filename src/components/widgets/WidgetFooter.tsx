'use client'

import { ExternalLink, Info } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { WidgetConfig } from '@/types/widget'

interface WidgetFooterProps {
  config: Pick<
    WidgetConfig,
    'agencies' | 'themes' | 'showLogo' | 'showLink' | 'showTooltip'
  >
  agencyNames?: Record<string, string>
  themeNames?: Record<string, string>
}

export function WidgetFooter({
  config,
  agencyNames = {},
  themeNames = {},
}: WidgetFooterProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false)

  // Gera URL de busca com filtros aplicados
  const buildSearchUrl = () => {
    const baseUrl = 'https://destaques.gov.br/busca'
    const params = new URLSearchParams()

    if (config.agencies && config.agencies.length > 0) {
      params.set('agencies', config.agencies.join(','))
    }

    if (config.themes && config.themes.length > 0) {
      params.set('themes', config.themes.join(','))
    }

    const queryString = params.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  const hasFilters =
    (config.agencies && config.agencies.length > 0) ||
    (config.themes && config.themes.length > 0)

  // Se nenhuma opção está ativa, não renderiza nada
  if (!config.showLogo && !config.showLink && !config.showTooltip) {
    return null
  }

  return (
    <div className="widget-footer px-4 py-3 border-t border-border bg-muted/30">
      <div className="flex items-center justify-between gap-4">
        {/* Logo DGB */}
        {config.showLogo && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative w-6 h-6">
              <Image
                src="/logo-dgb.svg"
                alt="DGB"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Destaques Gov.br
            </span>
          </div>
        )}

        {/* Link para busca com filtros */}
        {config.showLink && (
          <Link
            href={buildSearchUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors group flex-1 justify-center"
            data-umami-event="widget_footer_click"
            data-umami-event-origin="widget_embed"
          >
            <span className="font-medium">Ver mais no DGB</span>
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        )}

        {/* Tooltip com filtros */}
        {config.showTooltip && (
          <TooltipProvider>
            <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
                  aria-label="Informações sobre filtros"
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {!hasFilters ? (
                  <p className="text-sm">Exibindo todas as notícias recentes</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Filtros aplicados:</p>

                    {config.agencies && config.agencies.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Órgãos:
                        </p>
                        <ul className="text-xs space-y-0.5 mt-1">
                          {config.agencies.map((agency) => (
                            <li key={agency}>
                              • {agencyNames[agency] || agency}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {config.themes && config.themes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Temas:
                        </p>
                        <ul className="text-xs space-y-0.5 mt-1">
                          {config.themes.map((theme) => (
                            <li key={theme}>• {themeNames[theme] || theme}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
