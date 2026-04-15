import type { ReactNode } from 'react'

type PainPoint = {
  icon: ReactNode
  title: string
  description: string
}

type Props = {
  items: PainPoint[]
}

export function PainPointGrid({ items }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background p-6"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            {item.icon}
          </div>
          <h3 className="font-semibold text-base">{item.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  )
}
