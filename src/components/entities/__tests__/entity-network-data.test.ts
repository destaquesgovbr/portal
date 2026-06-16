import { describe, expect, it } from 'vitest'
import { entityTypeStyle } from '@/lib/entity-types'
import type { EntityNetwork } from '@/services/content/types'
import { maxEdgeWeight, toGraphData } from '../entity-network-data'

const NETWORK: EntityNetwork = {
  nodes: [
    { entityId: 'Q1', canonicalName: 'Finep', type: 'ORG', wikidataId: 'Q1' },
    { entityId: 'Q2', canonicalName: 'MCTI', type: 'ORG', wikidataId: 'Q2' },
    { entityId: 'Q3', canonicalName: 'Lula', type: 'PER', wikidataId: 'Q3' },
  ],
  edges: [
    { src: 'Q1', dst: 'Q2', weight: 7, kind: 'co_mention' },
    { src: 'Q1', dst: 'Q3', weight: 3, kind: 'co_mention' },
  ],
}

describe('toGraphData', () => {
  it('mapeia nós e links 1:1', () => {
    const data = toGraphData(NETWORK, 'Q1')
    expect(data.nodes).toHaveLength(3)
    expect(data.links).toHaveLength(2)
    expect(data.links[0]).toMatchObject({
      source: 'Q1',
      target: 'Q2',
      weight: 7,
    })
  })

  it('marca a entidade-foco como ego com raio maior', () => {
    const data = toGraphData(NETWORK, 'Q1')
    const ego = data.nodes.find((n) => n.id === 'Q1')
    const other = data.nodes.find((n) => n.id === 'Q3')
    expect(ego?.isEgo).toBe(true)
    expect(other?.isEgo).toBe(false)
    // Ego (grau 2, piso 6) > nó folha (grau 1, piso 2).
    expect(ego?.val).toBeGreaterThan(other?.val ?? 0)
  })

  it('atribui cor por tipo (fonte única: entity-types)', () => {
    const data = toGraphData(NETWORK, 'Q1')
    const org = data.nodes.find((n) => n.id === 'Q1')
    const per = data.nodes.find((n) => n.id === 'Q3')
    expect(org?.color).toBe(entityTypeStyle('ORG').color)
    expect(per?.color).toBe(entityTypeStyle('PER').color)
  })

  it('usa o id como nome quando canonicalName é nulo', () => {
    const data = toGraphData(
      {
        nodes: [
          {
            entityId: 'dgb_x',
            canonicalName: null,
            type: null,
            wikidataId: null,
          },
        ],
        edges: [],
      },
      'dgb_x',
    )
    expect(data.nodes[0].name).toBe('dgb_x')
    // Tipo nulo cai no estilo OTHER.
    expect(data.nodes[0].color).toBe(entityTypeStyle('OTHER').color)
  })
})

describe('maxEdgeWeight', () => {
  it('retorna o maior peso', () => {
    expect(
      maxEdgeWeight([
        { source: 'a', target: 'b', weight: 2 },
        { source: 'a', target: 'c', weight: 9 },
      ]),
    ).toBe(9)
  })

  it('retorna 1 (piso) quando não há arestas — evita divisão por zero', () => {
    expect(maxEdgeWeight([])).toBe(1)
  })
})
