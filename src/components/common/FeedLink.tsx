'use client'

import { Rss } from 'lucide-react'
import { useMemo } from 'react'

type FeedLinkParams = {
  q?: string
  agencias?: string[]
  temas?: string[]
  tag?: string
}

type FeedLinkProps = {
  params: FeedLinkParams
  className?: string
}

function buildFeedUrl(params: FeedLinkParams): string {
  const sp = new URLSearchParams()
  if (params.agencias && params.agencias.length > 0)
    sp.set('agencias', params.agencias.join(','))
  if (params.temas && params.temas.length > 0)
    sp.set('temas', params.temas.join(','))
  if (params.tag) sp.set('tag', params.tag)
  if (params.q) sp.set('q', params.q)
  const qs = sp.toString()
  return `/feed.xml${qs ? `?${qs}` : ''}`
}

export function FeedLink({ params, className }: FeedLinkProps) {
  const feedUrl = useMemo(() => buildFeedUrl(params), [params])

  return (
    <a
      href={feedUrl}
      title="Assinar feed RSS"
      className={`inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 transition-colors ${className ?? ''}`}
    >
      <Rss className="w-4 h-4" />
      <span>Feed RSS</span>
    </a>
  )
}
