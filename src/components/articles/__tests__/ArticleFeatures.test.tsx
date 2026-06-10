import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { ArticleEntity } from '@/types/article'
import { ArticleEntities, groupEntities } from '../ArticleFeatures'

function ent(
  text: string,
  type: string,
  count = 1,
  canonical_id: string | null = null,
): ArticleEntity {
  return { text, type, count, canonical_id }
}

describe('groupEntities', () => {
  it('agrupa por tipo na ordem ORG/PER/LOC/EVENT/POLICY', () => {
    const groups = groupEntities([
      ent('Bolsa Família', 'POLICY'),
      ent('Copa do Mundo', 'EVENT'),
      ent('Brasília', 'LOC'),
      ent('Lula', 'PER'),
      ent('MEC', 'ORG'),
    ])
    expect(groups.map((g) => g.label)).toEqual([
      'Instituições',
      'Pessoas',
      'Locais',
      'Eventos',
      'Políticas Públicas',
    ])
  })

  it('inclui grupos EVENT e POLICY (antes escondidos no balde MISC)', () => {
    const groups = groupEntities([
      ent('Enem 2026', 'EVENT'),
      ent('Pé-de-Meia', 'POLICY'),
    ])
    expect(groups.map((g) => g.label)).toEqual([
      'Eventos',
      'Políticas Públicas',
    ])
  })

  it('omite grupos vazios', () => {
    const groups = groupEntities([ent('MEC', 'ORG')])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Instituições')
  })

  it('drena tipos desconhecidos para o balde "Outros"', () => {
    const groups = groupEntities([ent('algo', 'LAW'), ent('MEC', 'ORG')])
    const labels = groups.map((g) => g.label)
    expect(labels).toContain('Instituições')
    expect(labels).toContain('Outros')
    // "Outros" sempre por último.
    expect(labels[labels.length - 1]).toBe('Outros')
  })

  it('ordena os itens de cada grupo por contagem desc', () => {
    const groups = groupEntities([
      ent('Pouco', 'ORG', 2),
      ent('Muito', 'ORG', 9),
    ])
    expect(groups[0].items.map((e) => e.text)).toEqual(['Muito', 'Pouco'])
  })
})

describe('ArticleEntities render', () => {
  it('não renderiza nada quando não há entidades', () => {
    const { container } = render(<ArticleEntities entities={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('linka chip canônico para /entidades/{canonicalId}', () => {
    render(
      <ArticleEntities
        entities={[ent('Ministério da Saúde', 'ORG', 3, 'Q216330')]}
      />,
    )
    const link = screen.getByRole('link', {
      name: /Ver notícias sobre Ministério da Saúde/i,
    })
    expect(link).toHaveAttribute('href', '/entidades/Q216330')
  })

  it('faz fallback para slug de texto quando a menção não tem id canônico', () => {
    render(<ArticleEntities entities={[ent('Lula', 'PER', 5, null)]} />)
    const link = screen.getByRole('link', {
      name: /Ver notícias sobre Lula/i,
    })
    expect(link).toHaveAttribute('href', '/entidades/lula')
  })

  it('renderiza as seções Eventos e Políticas Públicas', () => {
    render(
      <ArticleEntities
        entities={[
          ent('Copa do Mundo', 'EVENT'),
          ent('Bolsa Família', 'POLICY'),
        ]}
      />,
    )
    expect(screen.getByText('Eventos')).toBeInTheDocument()
    expect(screen.getByText('Políticas Públicas')).toBeInTheDocument()
  })
})
