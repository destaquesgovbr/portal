import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  number: number
  title: string
  description: string
  icon: ReactNode
  className?: string
}

/**
 * Numbered callout used in the showcase to annotate each DGB feature
 * embedded into the fictional portal mockup.
 */
export function CalloutAnnotation({
  number,
  title,
  description,
  icon,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex gap-4 rounded-lg border border-primary/20 bg-primary/5 p-5',
        className,
      )}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}
