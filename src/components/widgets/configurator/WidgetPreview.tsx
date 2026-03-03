'use client'

import { encodeWidgetConfig } from '@/lib/widget-utils'
import type { WidgetConfig } from '@/types/widget'

interface WidgetPreviewProps {
  config: WidgetConfig
}

export function WidgetPreview({ config }: WidgetPreviewProps) {
  const encoded = encodeWidgetConfig(config)
  const iframeUrl = `/embed?c=${encoded}`

  const width =
    config.size === 'custom' && config.width ? config.width : undefined
  const height =
    config.size === 'custom' && config.height ? config.height : undefined

  return (
    <div className="border-2 border-dashed border-border rounded-lg p-4 bg-muted/20">
      <div className="flex justify-center">
        <iframe
          key={encoded}
          src={iframeUrl}
          width={width || '100%'}
          height={height || '600'}
          title="Widget Preview"
          className="border-0 rounded-lg shadow-lg bg-white"
          data-testid="widget-preview"
        />
      </div>
    </div>
  )
}
