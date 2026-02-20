import { describe, expect, it, vi } from 'vitest'
import {
  buildFeedUrlFromParams,
  buildQueryString,
  computeETag,
  feedContentType,
  parseFeedParams,
  serializeFeed,
  validateFeedParams,
} from '../feed'

// Mock data utils to avoid filesystem access in tests
vi.mock('@/data/agencies-utils', () => ({
  getAgenciesByName: vi.fn().mockResolvedValue({
    mre: { name: 'Ministério das Relações Exteriores', type: 'Ministério' },
    saude: { name: 'Ministério da Saúde', type: 'Ministério' },
    mgi: { name: 'Ministério da Gestão e Inovação', type: 'Ministério' },
  }),
  getAgenciesList: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/data/themes-utils', () => ({
  getThemeNameByCode: vi.fn().mockImplementation((code: string) => {
    const themes: Record<string, string> = {
      '01': 'Economia e Finanças',
      '03': 'Saúde',
      '06': 'Educação',
    }
    return Promise.resolve(themes[code] ?? null)
  }),
}))

describe('parseFeedParams', () => {
  it('parses all parameters correctly', () => {
    const sp = new URLSearchParams(
      'q=reforma&agencias=mre,saude&temas=01,03&tag=economia&limit=30',
    )
    const params = parseFeedParams(sp)
    expect(params.q).toBe('reforma')
    expect(params.agencias).toEqual(['mre', 'saude'])
    expect(params.temas).toEqual(['01', '03'])
    expect(params.tag).toBe('economia')
    expect(params.limit).toBe(30)
  })

  it('returns undefined for missing parameters', () => {
    const sp = new URLSearchParams()
    const params = parseFeedParams(sp)
    expect(params.q).toBeUndefined()
    expect(params.agencias).toBeUndefined()
    expect(params.temas).toBeUndefined()
    expect(params.tag).toBeUndefined()
    expect(params.limit).toBeUndefined()
  })

  it('splits comma-separated agencias into array', () => {
    const sp = new URLSearchParams('agencias=mre,saude,mgi')
    const params = parseFeedParams(sp)
    expect(params.agencias).toEqual(['mre', 'saude', 'mgi'])
  })

  it('splits comma-separated temas into array', () => {
    const sp = new URLSearchParams('temas=01,03,06')
    const params = parseFeedParams(sp)
    expect(params.temas).toEqual(['01', '03', '06'])
  })

  it('handles single agency', () => {
    const sp = new URLSearchParams('agencias=mre')
    const params = parseFeedParams(sp)
    expect(params.agencias).toEqual(['mre'])
  })

  it('filters empty strings from split', () => {
    const sp = new URLSearchParams('agencias=mre,,saude,')
    const params = parseFeedParams(sp)
    expect(params.agencias).toEqual(['mre', 'saude'])
  })
})

describe('validateFeedParams', () => {
  it('accepts valid agencies', async () => {
    const error = await validateFeedParams({ agencias: ['mre', 'saude'] })
    expect(error).toBeNull()
  })

  it('rejects unknown agency', async () => {
    const error = await validateFeedParams({ agencias: ['invalido'] })
    expect(error).not.toBeNull()
    expect(error!.field).toBe('agencias')
    expect(error!.message).toContain('invalido')
  })

  it('accepts valid themes', async () => {
    const error = await validateFeedParams({ temas: ['01', '03'] })
    expect(error).toBeNull()
  })

  it('rejects unknown theme', async () => {
    const error = await validateFeedParams({ temas: ['99'] })
    expect(error).not.toBeNull()
    expect(error!.field).toBe('temas')
    expect(error!.message).toContain('99')
  })

  it('rejects q exceeding max length', async () => {
    const error = await validateFeedParams({ q: 'a'.repeat(201) })
    expect(error).not.toBeNull()
    expect(error!.field).toBe('q')
  })

  it('accepts q within max length', async () => {
    const error = await validateFeedParams({ q: 'a'.repeat(200) })
    expect(error).toBeNull()
  })

  it('rejects tag exceeding max length', async () => {
    const error = await validateFeedParams({ tag: 'a'.repeat(101) })
    expect(error).not.toBeNull()
    expect(error!.field).toBe('tag')
  })

  it('accepts empty params', async () => {
    const error = await validateFeedParams({})
    expect(error).toBeNull()
  })
})

describe('feedContentType', () => {
  it('returns correct type for rss', () => {
    expect(feedContentType('rss')).toBe('application/rss+xml; charset=utf-8')
  })

  it('returns correct type for atom', () => {
    expect(feedContentType('atom')).toBe('application/atom+xml; charset=utf-8')
  })

  it('returns correct type for json', () => {
    expect(feedContentType('json')).toBe('application/feed+json; charset=utf-8')
  })
})

describe('buildQueryString', () => {
  it('builds query string with multiple params', () => {
    const qs = buildQueryString({
      agencias: ['mre', 'saude'],
      temas: ['01'],
      q: 'reforma',
    })
    expect(qs).toContain('agencias=mre%2Csaude')
    expect(qs).toContain('temas=01')
    expect(qs).toContain('q=reforma')
    expect(qs).toMatch(/^\?/)
  })

  it('returns empty string for empty params', () => {
    expect(buildQueryString({})).toBe('')
  })

  it('omits undefined params', () => {
    const qs = buildQueryString({ agencias: ['mre'] })
    expect(qs).toBe('?agencias=mre')
    expect(qs).not.toContain('temas')
    expect(qs).not.toContain('q')
  })

  it('omits default limit', () => {
    const qs = buildQueryString({ limit: 20 })
    expect(qs).toBe('')
  })

  it('includes non-default limit', () => {
    const qs = buildQueryString({ limit: 30 })
    expect(qs).toContain('limit=30')
  })
})

describe('buildFeedUrlFromParams', () => {
  it('builds RSS URL', () => {
    const url = buildFeedUrlFromParams({ agencias: ['mre'] }, 'rss')
    expect(url).toBe('/feed.xml?agencias=mre')
  })

  it('builds Atom URL', () => {
    const url = buildFeedUrlFromParams({ temas: ['01'] }, 'atom')
    expect(url).toBe('/feed.atom?temas=01')
  })

  it('builds JSON Feed URL', () => {
    const url = buildFeedUrlFromParams({ q: 'teste' }, 'json')
    expect(url).toBe('/feed.json?q=teste')
  })

  it('builds URL without params', () => {
    expect(buildFeedUrlFromParams({}, 'rss')).toBe('/feed.xml')
  })
})

describe('computeETag', () => {
  it('returns quoted hash', () => {
    const etag = computeETag('test content')
    expect(etag).toMatch(/^"[a-f0-9]{32}"$/)
  })

  it('returns same hash for same content', () => {
    const a = computeETag('hello')
    const b = computeETag('hello')
    expect(a).toBe(b)
  })

  it('returns different hash for different content', () => {
    const a = computeETag('hello')
    const b = computeETag('world')
    expect(a).not.toBe(b)
  })
})

describe('serializeFeed', () => {
  // We need to import Feed dynamically since it's an external dependency
  it('generates valid RSS XML', async () => {
    const { Feed } = await import('feed')
    const feed = new Feed({
      title: 'Test',
      description: 'Test feed',
      id: 'https://test.com',
      link: 'https://test.com',
      copyright: 'Test',
    })
    feed.addItem({
      title: 'Item 1',
      id: 'item-1',
      link: 'https://test.com/item-1',
      date: new Date('2024-01-01'),
    })

    const rss = serializeFeed(feed, 'rss')
    expect(rss).toContain('<?xml')
    expect(rss).toContain('<rss')
    expect(rss).toContain('<title>Test</title>')
    expect(rss).toContain('Item 1')
    expect(rss).toContain('<guid')
  })

  it('generates valid Atom XML', async () => {
    const { Feed } = await import('feed')
    const feed = new Feed({
      title: 'Test',
      description: 'Test feed',
      id: 'https://test.com',
      link: 'https://test.com',
      copyright: 'Test',
    })
    feed.addItem({
      title: 'Item 1',
      id: 'item-1',
      link: 'https://test.com/item-1',
      date: new Date('2024-01-01'),
    })

    const atom = serializeFeed(feed, 'atom')
    expect(atom).toContain('<?xml')
    expect(atom).toContain('<feed')
    expect(atom).toContain('xmlns="http://www.w3.org/2005/Atom"')
    expect(atom).toContain('Item 1')
    expect(atom).toContain('<entry>')
  })

  it('generates valid JSON Feed', async () => {
    const { Feed } = await import('feed')
    const feed = new Feed({
      title: 'Test',
      description: 'Test feed',
      id: 'https://test.com',
      link: 'https://test.com',
      copyright: 'Test',
    })
    feed.addItem({
      title: 'Item 1',
      id: 'item-1',
      link: 'https://test.com/item-1',
      date: new Date('2024-01-01'),
    })

    const json = serializeFeed(feed, 'json')
    const parsed = JSON.parse(json)
    expect(parsed.version).toContain('jsonfeed.org')
    expect(parsed.title).toBe('Test')
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0].title).toBe('Item 1')
  })
})
