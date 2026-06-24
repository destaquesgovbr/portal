import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { RelatedEntity } from '@/services/content/types'
import { RelatedEntities } from '../RelatedEntities'

function rel(
  canonicalId: string,
  canonicalName: string | null,
  type: string | null,
  weight: number,
  kind = 'co_mention',
): RelatedEntity {
  return { canonicalId, canonicalName, type, wikidataId: null, weight, kind }
}

describe('RelatedEntities', () => {
  it('não renderiza nada quando não há entidades', () => {
    const { container } = render(<RelatedEntities entities={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('não renderiza nada quando entities é null/undefined', () => {
    const { container } = render(<RelatedEntities entities={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza o cabeçalho e um chip por entidade', () => {
    render(
      <RelatedEntities
        entities={[
          rel('Q216330', 'Ministério da Saúde', 'ORG', 12),
          rel('Q12345', 'Lula', 'PER', 8),
        ]}
      />,
    )
    expect(screen.getByText('Entidades relacionadas')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('linka cada chip para a página canônica da entidade vizinha', () => {
    render(
      <RelatedEntities
        entities={[rel('Q216330', 'Ministério da Saúde', 'ORG', 5)]}
      />,
    )
    const link = screen.getByRole('link', {
      name: /Ver a entidade Ministério da Saúde/i,
    })
    expect(link).toHaveAttribute('href', '/entidades/Q216330')
  })

  it('exibe o peso da aresta no aria-label ("N notícias juntas")', () => {
    render(<RelatedEntities entities={[rel('Q1', 'Finep', 'ORG', 3)]} />)
    expect(
      screen.getByRole('link', { name: /3 notícias juntas/i }),
    ).toBeInTheDocument()
  })

  it('singulariza o peso quando é 1 notícia', () => {
    render(<RelatedEntities entities={[rel('Q1', 'Finep', 'ORG', 1)]} />)
    expect(
      screen.getByRole('link', { name: /1 notícia juntas/i }),
    ).toBeInTheDocument()
  })

  it('cai no id canônico como rótulo quando não há canonicalName', () => {
    render(<RelatedEntities entities={[rel('dgb_abc', null, 'ORG', 2)]} />)
    expect(screen.getByText('dgb_abc')).toBeInTheDocument()
  })
})
