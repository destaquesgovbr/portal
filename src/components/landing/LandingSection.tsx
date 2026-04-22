import { cn } from '@/lib/utils'

type Variant = 'default' | 'muted' | 'primary'

type Props = {
  children: React.ReactNode
  variant?: Variant
  className?: string
  id?: string
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-background',
  muted: 'bg-muted/30',
  primary: 'bg-primary/5',
}

export function LandingSection({
  children,
  variant = 'default',
  className,
  id,
}: Props) {
  return (
    <section
      id={id}
      className={cn('py-16 sm:py-20', variantClasses[variant], className)}
    >
      <div className="container mx-auto px-4 max-w-6xl">{children}</div>
    </section>
  )
}
