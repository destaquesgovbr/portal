'use client'

import { generateIframeCode } from '@/lib/widget-utils'
import type { WidgetConfig } from '@/types/widget'

interface WidgetCodeDisplayProps {
  config: WidgetConfig
}

export function WidgetCodeDisplay({ config }: WidgetCodeDisplayProps) {
  const code = generateIframeCode(
    config,
    process.env.NEXT_PUBLIC_BASE_URL || 'https://destaques.gov.br',
  )

  return (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
        <code>{code}</code>
      </pre>
    </div>
  )
}
