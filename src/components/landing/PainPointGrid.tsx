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
          className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background p-8 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 text-destructive [&_svg]:h-7 [&_svg]:w-7">
            {item.icon}
          </div>
          <h3 className="font-semibold text-lg tracking-tight">{item.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  )
}
