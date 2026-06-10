/**
 * Testes do mapper compartilhado `mapGraphqlArticleToRow`
 * (graphql Article camelCase → ArticleRow snake_case).
 *
 * Este é o componente de mais alto risco da Fase 2B: ~10 server actions
 * dependem de que o mapeamento campo-a-campo e, sobretudo, a conversão de
 * data (ISO → Unix **segundos**) estejam exatos.
 */

import { describe, expect, it } from 'vitest'
import type { ArticleGraphQL } from '@/lib/graphql/queries/articles'
import { mapGraphqlArticleToRow } from '../graphql'

function fullArticle(): ArticleGraphQL {
  return {
    uniqueId: 'abc-123',
    title: 'Título do artigo',
    url: 'https://gov.br/noticia',
    image: 'https://gov.br/img.jpg',
    videoUrl: 'https://gov.br/video.mp4',
    content: 'Conteúdo completo',
    summary: 'Resumo',
    subtitle: 'Subtítulo',
    editorialLead: 'Linha fina editorial',
    category: 'Economia',
    tags: ['fgts', 'inss'],
    agency: 'ministerio-da-fazenda',
    agencyName: 'Ministério da Fazenda',
    publishedAt: '2026-05-01T10:00:00Z',
    extractedAt: '2026-05-01T12:30:00Z',
    theme1Level1Code: '01',
    theme1Level1Label: 'Economia e Finanças',
    theme1Level2Code: '0101',
    theme1Level2Label: 'Política Fiscal',
    theme1Level3Code: '010101',
    theme1Level3Label: 'Arrecadação',
    mostSpecificThemeCode: '010101',
    mostSpecificThemeLabel: 'Arrecadação',
  }
}

describe('mapGraphqlArticleToRow', () => {
  it('mapeia todos os campos camelCase → snake_case', () => {
    const row = mapGraphqlArticleToRow(fullArticle())

    expect(row.unique_id).toBe('abc-123')
    expect(row.title).toBe('Título do artigo')
    expect(row.url).toBe('https://gov.br/noticia')
    expect(row.image).toBe('https://gov.br/img.jpg')
    expect(row.video_url).toBe('https://gov.br/video.mp4')
    expect(row.content).toBe('Conteúdo completo')
    expect(row.summary).toBe('Resumo')
    expect(row.subtitle).toBe('Subtítulo')
    expect(row.editorial_lead).toBe('Linha fina editorial')
    expect(row.category).toBe('Economia')
    expect(row.tags).toEqual(['fgts', 'inss'])
  })

  it('mapeia os campos de tema (níveis 1-3 + mais específico)', () => {
    const row = mapGraphqlArticleToRow(fullArticle())

    expect(row.theme_1_level_1_code).toBe('01')
    expect(row.theme_1_level_1_label).toBe('Economia e Finanças')
    expect(row.theme_1_level_2_code).toBe('0101')
    expect(row.theme_1_level_2_label).toBe('Política Fiscal')
    expect(row.theme_1_level_3_code).toBe('010101')
    expect(row.theme_1_level_3_label).toBe('Arrecadação')
    expect(row.most_specific_theme_code).toBe('010101')
    expect(row.most_specific_theme_label).toBe('Arrecadação')
  })

  it('define theme_1_level_1 como alias de theme1Level1Label', () => {
    const row = mapGraphqlArticleToRow(fullArticle())
    expect(row.theme_1_level_1).toBe('Economia e Finanças')
  })

  it('usa `agency` (a chave) e NÃO sobrescreve com agencyName', () => {
    const row = mapGraphqlArticleToRow(fullArticle())
    expect(row.agency).toBe('ministerio-da-fazenda')
  })

  // --- CONVERSÃO DE DATA: o ponto crítico ---
  // Evidência no código existente (todos tratam published_at como Unix SEGUNDOS):
  //  - src/lib/utils.ts formatDateTime: `new Date(timestamp * 1000)`
  //  - src/lib/feed.ts: `new Date(article.published_at * 1000)`
  //  - clipping/release/[releaseId]/artigos/page.tsx: `published_at * 1000`
  //  - embed/actions.ts isoToUnixSeconds: `Math.floor(ms / 1000)`
  it('converte publishedAt ISO → Unix SEGUNDOS', () => {
    const row = mapGraphqlArticleToRow(fullArticle())
    // 2026-05-01T10:00:00Z == 1777629600 s
    expect(row.published_at).toBe(1777629600)
  })

  it('converte extractedAt ISO → Unix SEGUNDOS', () => {
    const row = mapGraphqlArticleToRow(fullArticle())
    // 2026-05-01T12:30:00Z == 1777638600 s
    expect(row.extracted_at).toBe(1777638600)
  })

  it('faz floor de segundos fracionários (ISO com milissegundos)', () => {
    const row = mapGraphqlArticleToRow({
      ...fullArticle(),
      publishedAt: '2026-05-01T10:00:00.750Z',
    })
    // 1777629600.750 s → floor → 1777629600
    expect(row.published_at).toBe(1777629600)
  })

  it('datas ausentes (null) → null', () => {
    const row = mapGraphqlArticleToRow({
      ...fullArticle(),
      publishedAt: null,
      extractedAt: null,
    })
    expect(row.published_at).toBeNull()
    expect(row.extracted_at).toBeNull()
  })

  it('datas inválidas → null', () => {
    const row = mapGraphqlArticleToRow({
      ...fullArticle(),
      publishedAt: 'not-a-date',
    })
    expect(row.published_at).toBeNull()
  })

  it('define published_year/month/week como null (não expostos pelo Article)', () => {
    const row = mapGraphqlArticleToRow(fullArticle())
    expect(row.published_year).toBeNull()
    expect(row.published_month).toBeNull()
    expect(row.published_week).toBeNull()
  })

  it('trata campos opcionais ausentes como null (e tags como null)', () => {
    const row = mapGraphqlArticleToRow({
      uniqueId: 'min-1',
      title: null,
      url: null,
      image: null,
      videoUrl: null,
      content: null,
      summary: null,
      subtitle: null,
      editorialLead: null,
      category: null,
      tags: null,
      agency: null,
      agencyName: null,
      publishedAt: null,
      extractedAt: null,
      theme1Level1Code: null,
      theme1Level1Label: null,
      theme1Level2Code: null,
      theme1Level2Label: null,
      theme1Level3Code: null,
      theme1Level3Label: null,
      mostSpecificThemeCode: null,
      mostSpecificThemeLabel: null,
    })

    expect(row.unique_id).toBe('min-1')
    expect(row.title).toBeNull()
    expect(row.video_url).toBeNull()
    expect(row.editorial_lead).toBeNull()
    expect(row.agency).toBeNull()
    expect(row.tags).toBeNull()
    expect(row.theme_1_level_1).toBeNull()
    expect(row.most_specific_theme_label).toBeNull()
  })
})

describe('mapGraphqlArticleToRow — features (entidades + lente)', () => {
  it('mapeia canonicalId/salience das entidades e contentAnnotations', () => {
    const row = mapGraphqlArticleToRow({
      ...fullArticle(),
      features: {
        entities: [
          {
            text: 'Ministério da Saúde',
            type: 'ORG',
            count: 3,
            canonicalId: 'Q216330',
            salience: 0.82,
          },
        ],
        contentAnnotations: [
          {
            start: 10,
            end: 29,
            type: 'ORG',
            text: 'Ministério da Saúde',
            canonicalId: 'Q216330',
          },
        ],
        viewCount: 12,
        uniqueSessions: 8,
        trendingScore: 1.7,
        wordCount: 420,
        readabilityFlesch: 55.5,
      },
    })

    expect(row.features?.entities[0]).toEqual({
      text: 'Ministério da Saúde',
      type: 'ORG',
      count: 3,
      canonical_id: 'Q216330',
      salience: 0.82,
    })
    expect(row.features?.content_annotations).toEqual([
      {
        start: 10,
        end: 29,
        type: 'ORG',
        text: 'Ministério da Saúde',
        canonical_id: 'Q216330',
      },
    ])
  })

  it('campos canônicos ausentes → null; contentAnnotations ausente → []', () => {
    const row = mapGraphqlArticleToRow({
      ...fullArticle(),
      features: {
        entities: [{ text: 'Lula', type: 'PER', count: 5 }],
        viewCount: null,
        uniqueSessions: null,
        trendingScore: null,
        wordCount: null,
        readabilityFlesch: null,
      },
    })

    expect(row.features?.entities[0]).toEqual({
      text: 'Lula',
      type: 'PER',
      count: 5,
      canonical_id: null,
      salience: null,
    })
    expect(row.features?.content_annotations).toEqual([])
  })

  it('features ausentes → null', () => {
    const row = mapGraphqlArticleToRow(fullArticle())
    expect(row.features).toBeNull()
  })
})
