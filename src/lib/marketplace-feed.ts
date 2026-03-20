import { Feed } from 'feed'
import type { MarketplaceListing, Release } from '@/types/clipping'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://destaques.gov.br'

export function generateMarketplaceFeed(
  listing: MarketplaceListing,
  releases: Release[],
): Feed {
  const sorted = [...releases].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const feed = new Feed({
    title: listing.name,
    description: listing.description,
    id: `${SITE_URL}/clippings/${listing.id}`,
    link: `${SITE_URL}/clippings/${listing.id}`,
    language: 'pt-BR',
    copyright: 'Governo Federal do Brasil',
    updated: sorted.length > 0 ? new Date(sorted[0].createdAt) : new Date(),
    generator: 'Destaques GOV.BR',
  })

  for (const release of sorted) {
    const date = new Date(release.createdAt)
    const dateStr = date.toLocaleDateString('pt-BR')

    feed.addItem({
      title: `${release.clippingName} — ${dateStr}`,
      id: release.id,
      link: release.releaseUrl,
      content: release.digestHtml,
      date,
    })
  }

  return feed
}
