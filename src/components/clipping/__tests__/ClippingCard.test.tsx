/**
 * Testes do ClippingCard (Fase B2 do PLANO-ATUALIZACAO-v2).
 *
 * Cobre as duas variações novas exigidas pelo plano:
 *   - mostra canais de entrega vindos de `clipping.deliveryChannels`
 *     (resolvidos do campo `mySubscription` do schema GraphQL no facade).
 *   - quando `isAuthor=false`, renderiza em modo read-only (sem editar,
 *     deletar ou publicar no marketplace).
 */

import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { Clipping } from '@/types/clipping'
import { ClippingCard } from '../ClippingCard'

function makeClipping(overrides: Partial<Clipping> = {}): Clipping {
  return {
    id: 'c1',
    name: 'Meu Clipping',
    recortes: [
      {
        id: 'r1',
        title: 'Recorte 1',
        themes: ['01'],
        agencies: [],
        keywords: [],
      },
    ],
    prompt: '',
    schedule: '0 8 * * *',
    deliveryChannels: {
      email: false,
      telegram: false,
      push: false,
      webhook: false,
    },
    active: true,
    extraEmails: [],
    webhookUrl: '',
    includeHistory: false,
    createdAt: '2026-05-26T00:00:00Z',
    updatedAt: '2026-05-26T00:00:00Z',
    ...overrides,
  }
}

describe('ClippingCard — canais de entrega', () => {
  it('test_clipping_card_shows_my_subscription_channels_from_graphql_field: renderiza badges baseados em deliveryChannels', () => {
    const clipping = makeClipping({
      deliveryChannels: {
        email: true,
        telegram: true,
        push: false,
        webhook: true,
      },
    })

    render(
      <ClippingCard
        clipping={clipping}
        onDelete={vi.fn()}
        onToggleActive={vi.fn()}
        onSend={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Telegram')).toBeInTheDocument()
    expect(screen.getByText('Webhook')).toBeInTheDocument()
    // Push está OFF, então o badge não aparece
    expect(screen.queryByText('Push')).not.toBeInTheDocument()
  })

  it('não renderiza nenhum badge quando todos os canais estão OFF', () => {
    const clipping = makeClipping()
    render(
      <ClippingCard
        clipping={clipping}
        onDelete={vi.fn()}
        onToggleActive={vi.fn()}
        onSend={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.queryByText('Email')).not.toBeInTheDocument()
    expect(screen.queryByText('Telegram')).not.toBeInTheDocument()
    expect(screen.queryByText('Push')).not.toBeInTheDocument()
    expect(screen.queryByText('Webhook')).not.toBeInTheDocument()
  })
})

describe('ClippingCard — read-only para não-autor', () => {
  it('test_subscribed_clipping_renders_read_only_for_non_author: esconde Editar/Excluir quando isAuthor=false', async () => {
    const clipping = makeClipping({
      deliveryChannels: {
        email: true,
        telegram: false,
        push: false,
        webhook: false,
      },
    })

    const { user } = render(
      <ClippingCard
        clipping={clipping}
        onDelete={vi.fn()}
        onToggleActive={vi.fn()}
        onSend={vi.fn().mockResolvedValue(undefined)}
        isAuthor={false}
      />,
    )

    // Abre o menu de ações
    const menuTrigger = screen.getByRole('button')
    await user.click(menuTrigger)

    // Send permanece (inscrito também pode disparar envio manual)
    expect(screen.getByText(/gerar e enviar agora/i)).toBeInTheDocument()
    // Editar/Excluir/Desativar/Publicar não aparecem
    expect(screen.queryByText('Editar')).not.toBeInTheDocument()
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument()
    expect(screen.queryByText('Desativar')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/publicar no marketplace/i),
    ).not.toBeInTheDocument()
  })

  it('mostra todas as ações quando isAuthor=true (default)', async () => {
    const clipping = makeClipping({
      deliveryChannels: {
        email: true,
        telegram: false,
        push: false,
        webhook: false,
      },
    })

    const { user } = render(
      <ClippingCard
        clipping={clipping}
        onDelete={vi.fn()}
        onToggleActive={vi.fn()}
        onSend={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    const menuTrigger = screen.getByRole('button')
    await user.click(menuTrigger)

    expect(screen.getByText('Editar')).toBeInTheDocument()
    expect(screen.getByText('Excluir')).toBeInTheDocument()
    expect(screen.getByText('Desativar')).toBeInTheDocument()
  })
})
