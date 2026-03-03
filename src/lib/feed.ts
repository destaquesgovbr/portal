import { createHash } from 'node:crypto'
import { Feed } from 'feed'
import { getAgenciesByName } from '@/data/agencies-utils'
import { getThemeNameByCode } from '@/data/themes-utils'
import { markdownToHtml } from '@/lib/markdown-to-html'
import { getExcerpt } from '@/lib/utils'
import { typesense } from '@/services/typesense/client'
import type { ArticleRow } from '@/types/article'

// --- Types ---

export type FeedFormat = 'rss' | 'atom' | 'json'

export type FeedParams = {
  q?: string
  agencias?: string[]
  temas?: string[]
  tag?: string
  limit?: number
}

type ValidationError = {
  field: string
  message: string
}

// --- Constants ---

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MAX_Q_LENGTH = 200
const MAX_TAG_LENGTH = 100
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://destaques.gov.br'

// --- Public API ---

export function parseFeedParams(searchParams: URLSearchParams): FeedParams {
  const agenciasRaw = searchParams.get('agencias')
  const temasRaw = searchParams.get('temas')

  return {
    q: searchParams.get('q') || undefined,
    agencias: agenciasRaw ? agenciasRaw.split(',').filter(Boolean) : undefined,
    temas: temasRaw ? temasRaw.split(',').filter(Boolean) : undefined,
    tag: searchParams.get('tag') || undefined,
    limit: searchParams.has('limit')
      ? Number.parseInt(searchParams.get('limit')!, 10)
      : undefined,
  }
}

export async function validateFeedParams(
  params: FeedParams,
): Promise<ValidationError | null> {
  if (params.q && params.q.length > MAX_Q_LENGTH) {
    return {
      field: 'q',
      message: `Parâmetro 'q' excede ${MAX_Q_LENGTH} caracteres`,
    }
  }

  if (params.tag && params.tag.length > MAX_TAG_LENGTH) {
    return {
      field: 'tag',
      message: `Parâmetro 'tag' excede ${MAX_TAG_LENGTH} caracteres`,
    }
  }

  if (params.agencias && params.agencias.length > 0) {
    const agencies = await getAgenciesByName()
    for (const key of params.agencias) {
      if (!agencies[key]) {
        return {
          field: 'agencias',
          message: `Órgão '${key}' não encontrado`,
        }
      }
    }
  }

  if (params.temas && params.temas.length > 0) {
    for (const code of params.temas) {
      const name = await getThemeNameByCode(code)
      if (!name) {
        return {
          field: 'temas',
          message: `Tema '${code}' não encontrado`,
        }
      }
    }
  }

  return null
}

export async function buildFeed(params: FeedParams): Promise<Feed> {
  const limit = clampLimit(params.limit)
  const meta = await buildFeedMeta(params)
  const articles = await queryArticlesForFeed(params, limit)
  const agenciesMap = await getAgenciesByName()

  const qs = buildQueryString(params)
  const feed = new Feed({
    title: meta.title,
    description: meta.description,
    id: SITE_URL,
    link: SITE_URL,
    language: 'pt-BR',
    feedLinks: {
      rss: `${SITE_URL}/feed.xml${qs}`,
      atom: `${SITE_URL}/feed.atom${qs}`,
      json: `${SITE_URL}/feed.json${qs}`,
    },
    copyright: 'Governo Federal do Brasil',
    updated:
      articles.length > 0 && articles[0].published_at
        ? new Date(articles[0].published_at * 1000)
        : new Date(),
    generator: 'Destaques GOV.BR',
  })

  for (const article of articles) {
    const htmlContent = article.content
      ? await markdownToHtml(article.content)
      : undefined

    const agencyName = article.agency
      ? (agenciesMap[article.agency]?.name ?? article.agency)
      : undefined

    feed.addItem({
      title: article.title ?? 'Sem título',
      id: article.unique_id,
      link: `${SITE_URL}/artigos/${article.unique_id}`,
      description:
        article.summary ??
        article.editorial_lead ??
        getExcerpt(article.content ?? '', 300),
      content: htmlContent,
      date: article.published_at
        ? new Date(article.published_at * 1000)
        : new Date(),
      image: article.image ?? undefined,
      category: buildCategories(article),
      author: agencyName ? [{ name: agencyName }] : [],
    })
  }

  return feed
}

export function serializeFeed(feed: Feed, format: FeedFormat): string {
  switch (format) {
    case 'rss':
      return feed.rss2()
    case 'atom':
      return feed.atom1()
    case 'json':
      return feed.json1()
  }
}

export function feedContentType(format: FeedFormat): string {
  switch (format) {
    case 'rss':
      return 'application/rss+xml; charset=utf-8'
    case 'atom':
      return 'application/atom+xml; charset=utf-8'
    case 'json':
      return 'application/feed+json; charset=utf-8'
  }
}

export function buildFeedUrlFromParams(
  params: FeedParams,
  format: FeedFormat = 'rss',
): string {
  const ext = format === 'rss' ? 'xml' : format === 'atom' ? 'atom' : 'json'
  return `/feed.${ext}${buildQueryString(params)}`
}

export function computeETag(body: string): string {
  return `"${createHash('md5').update(body).digest('hex')}"`
}

// --- Internal helpers ---

function clampLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT
  return Math.min(limit, MAX_LIMIT)
}

async function buildFeedMeta(
  params: FeedParams,
): Promise<{ title: string; description: string }> {
  const parts: string[] = ['Destaques GOV.BR']

  if (params.agencias && params.agencias.length > 0) {
    const agencies = await getAgenciesByName()
    const names = params.agencias
      .map((key) => agencies[key]?.name ?? key)
      .join(', ')
    parts.push(names)
  }

  if (params.temas && params.temas.length > 0) {
    const names: string[] = []
    for (const code of params.temas) {
      const name = await getThemeNameByCode(code)
      if (name) names.push(name)
    }
    if (names.length > 0) parts.push(names.join(', '))
  }

  if (params.tag) {
    parts.push(`Tag: ${params.tag}`)
  }

  if (params.q) {
    parts.push(`Busca: ${params.q}`)
  }

  const title = parts.join(' — ')
  const description =
    parts.length > 1
      ? `Feed de notícias: ${parts.slice(1).join(', ')}`
      : 'Notícias oficiais do Governo Federal do Brasil'

  return { title, description }
}

async function queryArticlesForFeed(
  params: FeedParams,
  limit: number,
): Promise<ArticleRow[]> {
  const filterParts: string[] = []

  if (params.agencias && params.agencias.length > 0) {
    filterParts.push(`agency:[${params.agencias.join(',')}]`)
  }

  if (params.temas && params.temas.length > 0) {
    const themeFilters = params.temas.map(
      (theme) =>
        `(theme_1_level_1_code:${theme} || theme_1_level_2_code:${theme} || theme_1_level_3_code:${theme})`,
    )
    filterParts.push(`(${themeFilters.join(' || ')})`)
  }

  if (params.tag) {
    filterParts.push(`tags:=${params.tag}`)
  }

  const result = await typesense
    .collections<ArticleRow>('news')
    .documents()
    .search({
      q: params.q?.trim().replace(/\s+/g, ' ') || '*',
      query_by: 'title,content',
      sort_by: 'published_at:desc,unique_id:desc',
      filter_by: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
      limit,
    })

  return (result.hits?.map((hit) => hit.document) ?? []) as ArticleRow[]
}

function buildCategories(article: ArticleRow): Array<{ name: string }> {
  const cats: Array<{ name: string }> = []

  if (article.most_specific_theme_label) {
    cats.push({ name: article.most_specific_theme_label })
  } else if (article.theme_1_level_1_label) {
    cats.push({ name: article.theme_1_level_1_label })
  }

  if (article.tags) {
    for (const tag of article.tags) {
      cats.push({ name: tag })
    }
  }

  return cats
}

export function buildQueryString(params: FeedParams): string {
  const sp = new URLSearchParams()
  if (params.agencias && params.agencias.length > 0)
    sp.set('agencias', params.agencias.join(','))
  if (params.temas && params.temas.length > 0)
    sp.set('temas', params.temas.join(','))
  if (params.tag) sp.set('tag', params.tag)
  if (params.q) sp.set('q', params.q)
  if (params.limit && params.limit !== DEFAULT_LIMIT)
    sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}
