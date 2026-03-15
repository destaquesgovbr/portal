'use client'

import { Loader2 } from 'lucide-react'

type Props = {
  count?: number
  loading?: boolean
}

export function ArticleCountBadge({ count, loading }: Props) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Estimando...
      </span>
    )
  }

  if (count === undefined || count === 0) return null

  const color =
    count > 100
      ? 'text-destructive bg-destructive/10'
      : count < 10
        ? 'text-yellow-700 bg-yellow-50'
        : 'text-emerald-700 bg-emerald-50'

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${color}`}
    >
      ~{count} notícias/dia
    </span>
  )
}
