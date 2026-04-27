'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WidgetCodeDisplay } from '@/components/widgets/configurator/WidgetCodeDisplay'
import { WidgetFilters } from '@/components/widgets/configurator/WidgetFilters'
import { WidgetPreview } from '@/components/widgets/configurator/WidgetPreview'
import {
  WIDGET_LAYOUT_DESCRIPTIONS,
  WIDGET_LAYOUT_LABELS,
  WIDGET_PRESETS,
  WIDGET_SIZE_LABELS,
} from '@/config/widget-presets'
import { generateIframeCode } from '@/lib/widget-utils'
import type { WidgetConfig, WidgetLayout, WidgetSize } from '@/types/widget'

export default function WidgetConfiguratorPage() {
  const [config, setConfig] = useState<WidgetConfig>({
    agencies: [],
    themes: [],
    layout: 'list',
    size: 'medium',
    showLogo: true,
    showLink: true,
    showTooltip: true,
    articlesPerPage: 10,
  })

  const [copied, setCopied] = useState(false)

  const updateConfig = (partial: Partial<WidgetConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }))
  }

  const handleCopyCode = () => {
    const code = generateIframeCode(
      config,
      process.env.NEXT_PUBLIC_BASE_URL || 'https://destaques.gov.br',
    )
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Configurador de Widget DGB
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Configure e integre facilmente notícias do Destaques Gov.br no seu
            portal
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Configuração */}
          <div className="space-y-6">
            {/* Seção 1: Filtros */}
            <Card>
              <CardHeader>
                <CardTitle>1. Filtros de Conteúdo</CardTitle>
              </CardHeader>
              <CardContent>
                <WidgetFilters
                  selectedAgencies={config.agencies}
                  selectedThemes={config.themes}
                  onAgenciesChange={(agencies) => updateConfig({ agencies })}
                  onThemesChange={(themes) => updateConfig({ themes })}
                />
              </CardContent>
            </Card>

            {/* Seção 2: Layout */}
            <Card>
              <CardHeader>
                <CardTitle>2. Layout e Tamanho</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Layout */}
                <div className="space-y-3">
                  <Label>Layout</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      ['list', 'grid-2', 'grid-3', 'carousel'] as WidgetLayout[]
                    ).map((layout) => (
                      <Button
                        key={layout}
                        type="button"
                        variant="outline"
                        onClick={() => updateConfig({ layout })}
                        className={`h-auto p-4 text-left flex-col items-start border-2 hover:shadow-md ${
                          config.layout === layout
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <div className="font-semibold mb-1">
                          {WIDGET_LAYOUT_LABELS[layout]}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {WIDGET_LAYOUT_DESCRIPTIONS[layout]}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Tamanho */}
                <div className="space-y-3">
                  <Label>Tamanho</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      ['small', 'medium', 'large', 'custom'] as WidgetSize[]
                    ).map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant="outline"
                        onClick={() => updateConfig({ size })}
                        className={`h-auto p-3 flex-col items-start border-2 ${
                          config.size === size
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <div className="font-semibold text-sm">
                          {WIDGET_SIZE_LABELS[size]}
                        </div>
                        {size !== 'custom' && (
                          <div className="text-xs text-muted-foreground font-normal mt-1">
                            {WIDGET_PRESETS[config.layout][size].width}×
                            {WIDGET_PRESETS[config.layout][size].height}px
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Dimensões customizadas */}
                {config.size === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="width">Largura (px)</Label>
                      <Input
                        id="width"
                        type="number"
                        min={200}
                        max={2000}
                        value={config.width || 400}
                        onChange={(e) =>
                          updateConfig({
                            width: Number.parseInt(e.target.value, 10),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Altura (px)</Label>
                      <Input
                        id="height"
                        type="number"
                        min={200}
                        max={2000}
                        value={config.height || 600}
                        onChange={(e) =>
                          updateConfig({
                            height: Number.parseInt(e.target.value, 10),
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seção 3: Branding */}
            <Card>
              <CardHeader>
                <CardTitle>3. Marca e Opções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showLogo"
                    checked={config.showLogo}
                    onChange={(e) =>
                      updateConfig({ showLogo: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showLogo" className="cursor-pointer">
                    Exibir logo DGB
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showLink"
                    checked={config.showLink}
                    onChange={(e) =>
                      updateConfig({ showLink: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showLink" className="cursor-pointer">
                    Link para portal DGB
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showTooltip"
                    checked={config.showTooltip}
                    onChange={(e) =>
                      updateConfig({ showTooltip: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <Label htmlFor="showTooltip" className="cursor-pointer">
                    Tooltip com filtros
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="articlesPerPage">Artigos por página</Label>
                  <Select
                    value={config.articlesPerPage.toString()}
                    onValueChange={(value) =>
                      updateConfig({
                        articlesPerPage: Number.parseInt(value, 10),
                      })
                    }
                  >
                    <SelectTrigger id="articlesPerPage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} artigos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Seção 4: Código */}
            <Card>
              <CardHeader>
                <CardTitle>4. Código de Integração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <WidgetCodeDisplay config={config} />

                <Button onClick={handleCopyCode} className="w-full" size="lg">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Código
                    </>
                  )}
                </Button>

                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-semibold">Como usar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Copie o código acima</li>
                    <li>Cole no HTML do seu site</li>
                    <li>O widget aparecerá automaticamente</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-8 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Preview Ao Vivo</CardTitle>
              </CardHeader>
              <CardContent>
                <WidgetPreview config={config} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
