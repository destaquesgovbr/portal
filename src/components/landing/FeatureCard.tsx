import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FlowBadge } from './FlowBadge'

type Flow = 'difusao' | 'inteligencia' | 'ambos'

type Props = {
  icon: ReactNode
  title: string
  description: string
  flow: Flow
  href?: string
  linkLabel?: string
  badge?: string
}

export function FeatureCard({
  icon,
  title,
  description,
  flow,
  href,
  linkLabel = 'Ver demonstração',
  badge,
}: Props) {
  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <FlowBadge flow={flow} />
        </div>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <CardTitle className="text-lg">{title}</CardTitle>
          {badge && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              {badge}
            </span>
          )}
        </div>
        <CardDescription className="text-sm leading-relaxed mt-1">
          {description}
        </CardDescription>
      </CardHeader>
      {href && (
        <CardContent className="mt-auto pt-0">
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      )}
    </Card>
  )
}
