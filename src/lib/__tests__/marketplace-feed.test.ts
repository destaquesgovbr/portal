import { describe, expect, it } from 'vitest'
import { generateMarketplaceFeed } from '@/lib/marketplace-feed'
import type { MarketplaceListing, Release } from '@/types/clipping'

function makeListing(
  overrides: Partial<MarketplaceListing> = {},
): MarketplaceListing {
  return {
    id: 'listing-1',
    authorUserId: 'author-1',
    authorDisplayName: 'Author',
    sourceClippingId: 'clip-1',
    name: 'Meio Ambiente',
    description: 'Notícias ambientais',
    recortes: [],
    prompt: 'Resuma',
    likeCount: 0,
    followerCount: 0,
    cloneCount: 0,
    publishedAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    active: true,
    ...overrides,
  }
}

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 'release-1',
    clippingId: 'clip-1',
    userId: 'author-1',
    clippingName: 'Meio Ambiente',
    digest: 'Resumo do dia',
    digestHtml: '<p>Resumo do dia</p>',
    articlesCount: 5,
    createdAt: '2024-06-15T08:00:00.000Z',
    releaseUrl: 'https://example.com/releases/release-1',
    ...overrides,
  }
}

describe('generateMarketplaceFeed', () => {
  it('generates RSS with listing title and release items', () => {
    const listing = makeListing({ name: 'Saúde Pública' })
    const releases = [makeRelease()]

    const feed = generateMarketplaceFeed(listing, releases)
    const rss = feed.rss2()

    expect(rss).toContain('<title>Saúde Pública</title>')
    expect(rss).toContain('Meio Ambiente')
    expect(rss).toContain('https://example.com/releases/release-1')
  })

  it('generates JSON Feed', () => {
    const listing = makeListing({ name: 'Educação' })
    const releases = [makeRelease({ clippingName: 'Educação' })]

    const feed = generateMarketplaceFeed(listing, releases)
    const json = JSON.parse(feed.json1())

    expect(json.title).toBe('Educação')
    expect(json.items).toHaveLength(1)
    expect(json.items[0].url).toBe('https://example.com/releases/release-1')
  })

  it('returns empty feed when no releases', () => {
    const listing = makeListing()
    const feed = generateMarketplaceFeed(listing, [])
    const json = JSON.parse(feed.json1())

    expect(json.title).toBe('Meio Ambiente')
    expect(json.items).toHaveLength(0)
  })

  it('each item has link to releaseUrl', () => {
    const releases = [
      makeRelease({
        id: 'r1',
        releaseUrl: 'https://example.com/releases/r1',
      }),
      makeRelease({
        id: 'r2',
        releaseUrl: 'https://example.com/releases/r2',
      }),
    ]

    const feed = generateMarketplaceFeed(makeListing(), releases)
    const json = JSON.parse(feed.json1())

    expect(json.items[0].url).toBe('https://example.com/releases/r1')
    expect(json.items[1].url).toBe('https://example.com/releases/r2')
  })

  it('items ordered by date (most recent first)', () => {
    const releases = [
      makeRelease({
        id: 'older',
        createdAt: '2024-06-10T08:00:00.000Z',
        clippingName: 'Older',
      }),
      makeRelease({
        id: 'newer',
        createdAt: '2024-06-20T08:00:00.000Z',
        clippingName: 'Newer',
      }),
    ]

    const feed = generateMarketplaceFeed(makeListing(), releases)
    const json = JSON.parse(feed.json1())

    expect(json.items[0].id).toBe('newer')
    expect(json.items[1].id).toBe('older')
  })
})
