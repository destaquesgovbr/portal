import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { EntityNetwork as EntityNetworkData } from '@/services/content/types'
import EntityNetwork from '../EntityNetwork'

// Mock do canvas (client-only, depende de window): substituímos por um marcador
// simples para validar a orquestração (toggle/fetch/estados) sem renderizar o
// force-graph de verdade.
vi.mock('../EntityNetworkGraph', () => ({
  default: ({ egoId }: { egoId: string }) => (
    <div data-testid="network-graph">graph:{egoId}</div>
  ),
}))

const NETWORK: EntityNetworkData = {
  nodes: [
    { entityId: 'Q1', canonicalName: 'Finep', type: 'ORG', wikidataId: 'Q1' },
    { entityId: 'Q2', canonicalName: 'MCTI', type: 'ORG', wikidataId: 'Q2' },
  ],
  edges: [{ src: 'Q1', dst: 'Q2', weight: 5, kind: 'co_mention' }],
}

const EMPTY: EntityNetworkData = { nodes: [], edges: [] }

describe('EntityNetwork', () => {
  it('começa com o toggle desligado (rede não carregada)', () => {
    const fetchNetwork = vi.fn().mockResolvedValue(NETWORK)
    render(<EntityNetwork entityId="Q1" fetchNetwork={fetchNetwork} />)

    // Toggle visível, mas a query NÃO dispara enquanto OFF.
    expect(
      screen.getByRole('button', { name: /Ver rede/i }),
    ).toBeInTheDocument()
    expect(fetchNetwork).not.toHaveBeenCalled()
    expect(screen.queryByTestId('network-graph')).not.toBeInTheDocument()
  })

  it('liga o toggle, busca e renderiza o grafo', async () => {
    const fetchNetwork = vi.fn().mockResolvedValue(NETWORK)
    const { user } = render(
      <EntityNetwork entityId="Q1" fetchNetwork={fetchNetwork} />,
    )

    await user.click(screen.getByRole('button', { name: /Ver rede/i }))

    await waitFor(() =>
      expect(screen.getByTestId('network-graph')).toBeInTheDocument(),
    )
    expect(fetchNetwork).toHaveBeenCalledWith('Q1', 1, 50)
    expect(screen.getByTestId('network-graph')).toHaveTextContent('graph:Q1')
    // O botão passa a oferecer ocultar.
    expect(
      screen.getByRole('button', { name: /Ocultar rede/i }),
    ).toBeInTheDocument()
  })

  it('mostra estado vazio quando a rede não tem nós', async () => {
    const fetchNetwork = vi.fn().mockResolvedValue(EMPTY)
    const { user } = render(
      <EntityNetwork entityId="Q1" fetchNetwork={fetchNetwork} />,
    )

    await user.click(screen.getByRole('button', { name: /Ver rede/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/Ainda não há conexões suficientes/i),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('network-graph')).not.toBeInTheDocument()
  })

  it('mostra estado de erro quando a busca falha', async () => {
    const fetchNetwork = vi.fn().mockRejectedValue(new Error('boom'))
    const { user } = render(
      <EntityNetwork entityId="Q1" fetchNetwork={fetchNetwork} />,
    )

    await user.click(screen.getByRole('button', { name: /Ver rede/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/Não foi possível carregar a rede/i),
      ).toBeInTheDocument(),
    )
  })

  it('repassa depth/limit customizados para o fetch', async () => {
    const fetchNetwork = vi.fn().mockResolvedValue(NETWORK)
    const { user } = render(
      <EntityNetwork
        entityId="Q9"
        depth={2}
        limit={30}
        fetchNetwork={fetchNetwork}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Ver rede/i }))

    await waitFor(() => expect(fetchNetwork).toHaveBeenCalledWith('Q9', 2, 30))
  })
})
