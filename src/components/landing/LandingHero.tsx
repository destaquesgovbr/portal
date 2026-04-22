import Link from 'next/link'
import { Button } from '@/components/ui/button'

type CTA = {
  label: string
  href: string
}

type Props = {
  eyebrow?: string
  title: string
  subtitle: string
  primaryCta: CTA
  secondaryCta?: CTA
  visual?: React.ReactNode
}

export function LandingHero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  visual,
}: Props) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 max-w-6xl py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="flex flex-col gap-6">
            {eyebrow && (
              <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {eyebrow}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              {title}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              <Button size="lg" asChild>
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
              {secondaryCta && (
                <Button size="lg" variant="outline" asChild>
                  <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                </Button>
              )}
            </div>
          </div>
          {visual && (
            <div className="hidden lg:flex justify-center">{visual}</div>
          )}
        </div>
      </div>
    </section>
  )
}
