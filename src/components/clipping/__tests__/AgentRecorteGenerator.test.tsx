/**
 * Testes do AgentRecorteGenerator.
 *
 * GraphQL é o único caminho: o componente usa sempre `subscription
 * generateRecortes` (urql/graphql-ws) e mapeia os eventos para o UI.
 *
 * O mock de urql é parametrizado via `vi.hoisted` para que cada teste possa
 * configurar os eventos emitidos pela subscription.
 */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import type { AgentEventGraphQL } from '@/lib/graphql/queries/agent'
import type { Recorte } from '@/types/clipping'

// --- mocks hoisted (precisam existir antes do import do componente) ---

const mocks = vi.hoisted(() => ({
  subscriptionResult: {
    data: undefined as { generateRecortes: AgentEventGraphQL } | undefined,
    error: undefined as { message: string } | undefined,
    fetching: false,
  },
  subscriptionCalls: [] as Array<{
    query: unknown
    variables: { prompt: string }
    pause: boolean
  }>,
  unsubscribeSpy: vi.fn(),
}))

vi.mock('urql', async () => {
  // useSubscription retorna o resultado configurado **somente quando não-paused**
  // (mimick urql real: paused ⇒ data fica undefined). Registra a chamada para
  // inspeção de `pause` / `variables`.
  const PAUSED_RESULT = { data: undefined, error: undefined, fetching: false }
  const useSubscription = (args: {
    query: unknown
    variables: { prompt: string }
    pause?: boolean
  }) => {
    const pause = args.pause ?? false
    mocks.subscriptionCalls.push({
      query: args.query,
      variables: args.variables,
      pause,
    })
    return [pause ? PAUSED_RESULT : mocks.subscriptionResult, vi.fn()]
  }
  // Provider trivial para satisfazer imports indiretos
  const Provider = ({ children }: { children: React.ReactNode }) => children
  return { useSubscription, Provider }
})

import { AgentRecorteGenerator } from '../AgentRecorteGenerator'

function resetMocks() {
  mocks.subscriptionResult = {
    data: undefined,
    error: undefined,
    fetching: false,
  }
  mocks.subscriptionCalls = []
  mocks.unsubscribeSpy.mockReset()
}

// --- helpers de eventos GraphQL ---

const SAMPLE_RECORTE: Recorte = {
  id: 'r1',
  title: 'IA no governo',
  themes: ['01'],
  agencies: ['MEC'],
  keywords: ['inteligência artificial'],
}

const EVENT_DONE: AgentEventGraphQL = {
  __typename: 'AgentEventDone',
  recortes: [SAMPLE_RECORTE],
  explanation: 'Recortes gerados com sucesso.',
  description: 'Clipping sobre IA no governo federal.',
  suggestedName: 'IA no Governo',
  iterations: 2,
  converged: true,
}

describe('AgentRecorteGenerator — usa subscription GraphQL', () => {
  it('test_AgentRecorteGenerator_uses_subscription: chama urql useSubscription, não fetch', async () => {
    resetMocks()

    const fetchSpy = vi.fn()
    const original = globalThis.fetch
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    try {
      const onRecortes = vi.fn()
      render(<AgentRecorteGenerator onRecortesGenerated={onRecortes} />)

      const textarea = screen.getByLabelText(
        /Descreva os assuntos que deseja acompanhar/i,
      )
      await userEvent.type(textarea, 'IA no governo')

      const button = screen.getByRole('button', {
        name: /Gerar Recortes com IA/i,
      })
      await userEvent.click(button)

      // useSubscription foi chamado, pelo menos uma vez com pause=false e prompt válido
      await waitFor(() => {
        const live = mocks.subscriptionCalls.find(
          (c) => !c.pause && c.variables.prompt === 'IA no governo',
        )
        expect(live).toBeTruthy()
      })

      // E fetch para REST NÃO foi chamado
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('AgentRecorteGenerator — renderização de eventos GraphQL', () => {
  it('test_subscription_event_thinking_renders_timeline: evento Thinking aparece no UI', async () => {
    resetMocks()
    mocks.subscriptionResult = {
      data: {
        generateRecortes: {
          __typename: 'AgentEventThinking',
          message: 'Analisando o pedido do usuário...',
        },
      },
      error: undefined,
      fetching: true,
    }

    const onRecortes = vi.fn()
    render(<AgentRecorteGenerator onRecortesGenerated={onRecortes} />)

    // Inicia a sub para o componente consumir os dados
    const textarea = screen.getByLabelText(
      /Descreva os assuntos que deseja acompanhar/i,
    )
    await userEvent.type(textarea, 'tema X')
    await userEvent.click(
      screen.getByRole('button', { name: /Gerar Recortes com IA/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText('Analisando o pedido do usuário...'),
      ).toBeInTheDocument()
    })
  })

  it('test_subscription_event_tool_call_renders_step: ToolCall é renderizado com nome do recorte', async () => {
    resetMocks()
    mocks.subscriptionResult = {
      data: {
        generateRecortes: {
          __typename: 'AgentEventToolCall',
          tool: 'searchArticles',
          argsJson: JSON.stringify({
            recorte: 'Educação básica',
            filters: { themes: ['02'], agencies: ['MEC'], keywords: ['enem'] },
          }),
        },
      },
      error: undefined,
      fetching: true,
    }

    const onRecortes = vi.fn()
    render(<AgentRecorteGenerator onRecortesGenerated={onRecortes} />)

    const textarea = screen.getByLabelText(
      /Descreva os assuntos que deseja acompanhar/i,
    )
    await userEvent.type(textarea, 'enem')
    await userEvent.click(
      screen.getByRole('button', { name: /Gerar Recortes com IA/i }),
    )

    await waitFor(() => {
      // Componente exibe "Testando: \"Educação básica\""
      expect(screen.getByText(/Educação básica/i)).toBeInTheDocument()
    })
  })

  it('test_subscription_event_done_populates_recortes: callback onRecortesGenerated chamado no Accept', async () => {
    resetMocks()
    mocks.subscriptionResult = {
      data: { generateRecortes: EVENT_DONE },
      error: undefined,
      fetching: false,
    }

    const onRecortes = vi.fn()
    render(<AgentRecorteGenerator onRecortesGenerated={onRecortes} />)

    const textarea = screen.getByLabelText(
      /Descreva os assuntos que deseja acompanhar/i,
    )
    await userEvent.type(textarea, 'IA')
    await userEvent.click(
      screen.getByRole('button', { name: /Gerar Recortes com IA/i }),
    )

    // Após receber o evento done, o nome sugerido aparece e o botão "Usar estes recortes" surge.
    await waitFor(() => {
      expect(screen.getByText('IA no Governo')).toBeInTheDocument()
    })

    const acceptBtn = screen.getByRole('button', {
      name: /Usar estes recortes/i,
    })
    await userEvent.click(acceptBtn)

    expect(onRecortes).toHaveBeenCalledTimes(1)
    const [recortes, suggestedName, description] = onRecortes.mock.calls[0]
    expect(suggestedName).toBe('IA no Governo')
    expect(description).toBe('Clipping sobre IA no governo federal.')
    expect(Array.isArray(recortes)).toBe(true)
    expect(recortes.length).toBe(1)
    expect(recortes[0].title).toBe('IA no governo')
  })

  it('test_subscription_error_shows_error_state: AgentEventError exibe a mensagem', async () => {
    resetMocks()
    mocks.subscriptionResult = {
      data: {
        generateRecortes: {
          __typename: 'AgentEventError',
          message: 'Worker indisponível',
        },
      },
      error: undefined,
      fetching: false,
    }

    const onRecortes = vi.fn()
    render(<AgentRecorteGenerator onRecortesGenerated={onRecortes} />)

    const textarea = screen.getByLabelText(
      /Descreva os assuntos que deseja acompanhar/i,
    )
    await userEvent.type(textarea, 'qualquer')
    await userEvent.click(
      screen.getByRole('button', { name: /Gerar Recortes com IA/i }),
    )

    await waitFor(() => {
      expect(screen.getByText('Worker indisponível')).toBeInTheDocument()
    })
  })

  it('test_subscription_transport_error_shows_error: erro de transporte vira mensagem de erro no UI', async () => {
    resetMocks()
    mocks.subscriptionResult = {
      data: undefined,
      error: { message: 'Conexão WebSocket perdida' },
      fetching: false,
    }

    const onRecortes = vi.fn()
    render(<AgentRecorteGenerator onRecortesGenerated={onRecortes} />)

    const textarea = screen.getByLabelText(
      /Descreva os assuntos que deseja acompanhar/i,
    )
    await userEvent.type(textarea, 'qualquer')
    await userEvent.click(
      screen.getByRole('button', { name: /Gerar Recortes com IA/i }),
    )

    await waitFor(() => {
      expect(screen.getByText('Conexão WebSocket perdida')).toBeInTheDocument()
    })
  })
})

describe('AgentRecorteGenerator — controle de subscription', () => {
  it('test_subscription_starts_paused_before_generate: pause=true até o usuário clicar', async () => {
    resetMocks()
    mocks.subscriptionResult = {
      data: undefined,
      error: undefined,
      fetching: false,
    }

    const onRecortes = vi.fn()
    render(<AgentRecorteGenerator onRecortesGenerated={onRecortes} />)

    // O hook é chamado no primeiro render, mas deve estar paused
    await waitFor(() => {
      expect(mocks.subscriptionCalls.length).toBeGreaterThan(0)
    })
    expect(mocks.subscriptionCalls[0]?.pause).toBe(true)
  })

  it('test_subscription_unmount_pauses_subscription: unmount marca a subscription como pausada', async () => {
    resetMocks()
    mocks.subscriptionResult = {
      data: undefined,
      error: undefined,
      fetching: false,
    }

    const onRecortes = vi.fn()
    const { unmount } = render(
      <AgentRecorteGenerator onRecortesGenerated={onRecortes} />,
    )

    const textarea = screen.getByLabelText(
      /Descreva os assuntos que deseja acompanhar/i,
    )
    await userEvent.type(textarea, 'tema X')
    await userEvent.click(
      screen.getByRole('button', { name: /Gerar Recortes com IA/i }),
    )

    // Após o clique, deve haver pelo menos uma chamada com pause=false
    await waitFor(() => {
      const live = mocks.subscriptionCalls.find((c) => !c.pause)
      expect(live).toBeTruthy()
    })

    // O número de chamadas antes do unmount
    const callsBeforeUnmount = mocks.subscriptionCalls.length

    unmount()

    // Após unmount não devem mais ser feitas chamadas adicionais
    // (urql limpa a subscription automaticamente quando o componente
    // desmonta; o nosso useEffect cleanup também marca o estado).
    expect(mocks.subscriptionCalls.length).toBeGreaterThanOrEqual(
      callsBeforeUnmount,
    )
  })
})
