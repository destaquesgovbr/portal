import type { ReactNode } from 'react'
import type { WidgetConfig } from '@/types/widget'

interface WidgetContainerProps {
  config: WidgetConfig
  children: ReactNode
}

export function WidgetContainer({ config, children }: WidgetContainerProps) {
  const { width, height, size } = config

  // Se for custom, usa as dimensões específicas
  const style =
    size === 'custom' && width && height
      ? { width: `${width}px`, height: `${height}px` }
      : {}

  return (
    <div
      className="widget-container bg-background text-foreground font-sans"
      style={style}
      data-testid="widget-container"
    >
      <div className="flex flex-col h-full overflow-auto">{children}</div>
    </div>
  )
}
