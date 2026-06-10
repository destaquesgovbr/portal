import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { ContentAnnotation } from '@/types/article'
import { buildSegments, foldForMatch, SemanticLens } from '../SemanticLens'

function ann(
  start: number,
  end: number,
  text: string,
  type = 'ORG',
  canonical_id: string | null = null,
): ContentAnnotation {
  return { start, end, type, text, canonical_id }
}

describe('foldForMatch', () => {
  it('dobra caixa e acentos (NFC + casefold + sem acento)', () => {
    expect(foldForMatch('Ministério')).toBe('ministerio')
    expect(foldForMatch('SAÚDE')).toBe(foldForMatch('saúde'))
  })
})

describe('buildSegments — validate-then-split', () => {
  it('destaca um span válido e mantém o texto ao redor', () => {
    const content = 'Visita ao Ministério da Saúde hoje.'
    const start = content.indexOf('Ministério da Saúde')
    const end = start + 'Ministério da Saúde'.length
    const segments = buildSegments(content, [
      ann(start, end, 'Ministério da Saúde', 'ORG', 'Q216330'),
    ])

    const entity = segments.filter((s) => s.kind === 'entity')
    expect(entity).toHaveLength(1)
    expect(entity[0]).toMatchObject({
      text: 'Ministério da Saúde',
      type: 'ORG',
      canonicalId: 'Q216330',
    })
    // Texto: prefixo + sufixo (dois segmentos de texto envolvendo o destaque).
    const text = segments.filter((s) => s.kind === 'text')
    expect(text.map((s) => s.text).join('')).toContain('Visita ao ')
  })

  it('valida insensível a acento/caixa (drift Markdown↔plain tolerado)', () => {
    const content = 'O ministério da saude agiu.'
    const start = content.indexOf('ministério da saude')
    const end = start + 'ministério da saude'.length
    const segments = buildSegments(content, [
      // surface da anotação difere em caixa/acento do slice, mas folda igual.
      ann(start, end, 'Ministério da Saúde', 'ORG'),
    ])
    expect(segments.some((s) => s.kind === 'entity')).toBe(true)
  })

  it('descarta span "driftado" (slice foldado ≠ text foldado)', () => {
    const content = 'Texto totalmente diferente aqui.'
    const segments = buildSegments(content, [
      // offsets apontam para "Texto tota" que não folda para "Bolsa Família".
      ann(0, 10, 'Bolsa Família', 'POLICY'),
    ])
    expect(segments.every((s) => s.kind === 'text')).toBe(true)
    expect(segments.map((s) => s.text).join('')).toBe(content)
  })

  it('descarta offsets fora dos limites ou degenerados', () => {
    const content = 'curto'
    expect(
      buildSegments(content, [ann(0, 999, 'curto')]).every(
        (s) => s.kind === 'text',
      ),
    ).toBe(true)
    expect(
      buildSegments(content, [ann(3, 3, '')]).every((s) => s.kind === 'text'),
    ).toBe(true)
  })

  it('não destaca nada quando não há anotações (texto puro)', () => {
    const content = 'Sem entidades.'
    const segments = buildSegments(content, [])
    expect(segments).toEqual([{ kind: 'text', text: content, start: 0 }])
  })

  it('resolve overlap mantendo o primeiro/maior e pulando o aninhado', () => {
    // "Ministério da Educação (MEC)" engloba "MEC" — varredura start asc, len
    // desc: o maior vence, o aninhado é pulado (non-overlapping).
    const content = 'Ministério da Educação (MEC) anunciou.'
    const outerStart = 0
    const outerEnd = 'Ministério da Educação (MEC)'.length
    const mecStart = content.indexOf('MEC')
    const segments = buildSegments(content, [
      ann(mecStart, mecStart + 3, 'MEC', 'ORG'),
      ann(outerStart, outerEnd, 'Ministério da Educação (MEC)', 'ORG'),
    ])
    const entities = segments.filter((s) => s.kind === 'entity')
    expect(entities).toHaveLength(1)
    expect(entities[0].text).toBe('Ministério da Educação (MEC)')
  })

  it('destaca múltiplas entidades distintas em ordem', () => {
    const content = 'Lula e Haddad reuniram-se.'
    const segments = buildSegments(content, [
      ann(0, 4, 'Lula', 'PER', 'Q8412'),
      ann(7, 13, 'Haddad', 'PER'),
    ])
    const entities = segments.filter((s) => s.kind === 'entity')
    expect(entities.map((e) => e.text)).toEqual(['Lula', 'Haddad'])
  })
})

describe('SemanticLens render', () => {
  it('renderiza o destaque como link para a entidade canônica', () => {
    const content = 'Sobre o Pé-de-Meia.'
    const start = content.indexOf('Pé-de-Meia')
    const end = start + 'Pé-de-Meia'.length
    render(
      <SemanticLens
        content={content}
        annotations={[ann(start, end, 'Pé-de-Meia', 'POLICY', 'dgb_xyz')]}
      />,
    )
    const link = screen.getByRole('link', {
      name: /Ver notícias sobre Pé-de-Meia/i,
    })
    expect(link).toHaveAttribute('href', '/entidades/dgb_xyz')
  })

  it('faz fallback para slug de texto quando não há id canônico', () => {
    const content = 'Sobre o Pé-de-Meia.'
    const start = content.indexOf('Pé-de-Meia')
    const end = start + 'Pé-de-Meia'.length
    render(
      <SemanticLens
        content={content}
        annotations={[ann(start, end, 'Pé-de-Meia', 'POLICY', null)]}
      />,
    )
    const link = screen.getByRole('link', {
      name: /Ver notícias sobre Pé-de-Meia/i,
    })
    expect(link).toHaveAttribute('href', '/entidades/pe-de-meia')
  })
})
