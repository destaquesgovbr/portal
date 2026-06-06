/**
 * Testes do wrapper de feature flags (PLANO-ATUALIZACAO-v2, Fase B1).
 *
 * Cobre:
 *   - `useFeatureFlag(key, defaultValue)`: leitura client-side com fail-safe.
 *   - `getFeatureFlag(key, defaultValue, gb)`: leitura server-side.
 *   - Constante `GRAPHQL_FLAGS`: chaves planejadas para B2-B5.
 */

import {
  type GrowthBook,
  GrowthBookContext,
} from '@growthbook/growthbook-react'
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockIsGrowthBookConfigured = vi.fn(() => true)

vi.mock('@/ab-testing/growthbook', () => ({
  isGrowthBookConfigured: () => mockIsGrowthBookConfigured(),
}))

import { GRAPHQL_FLAGS, getFeatureFlag, useFeatureFlag } from '../feature-flags'

/**
 * Wrapper que injeta um `growthbook` no `GrowthBookContext` sem precisar
 * carregar features de rede. Simula o estado "provider pronto".
 */
function withGrowthBook(gb: Partial<GrowthBook>) {
  return function GrowthBookContextProvider({
    children,
  }: {
    children: ReactNode
  }) {
    return createElement(
      GrowthBookContext.Provider,
      { value: { growthbook: gb as GrowthBook } },
      children,
    )
  }
}

describe('useFeatureFlag', () => {
  beforeEach(() => {
    mockIsGrowthBookConfigured.mockReset()
    mockIsGrowthBookConfigured.mockReturnValue(true)
  })

  it('test_useFeatureFlag_returns_true_when_growthbook_returns_true', () => {
    const wrapper = withGrowthBook({
      getFeatureValue: vi.fn().mockReturnValue(true),
    })
    const { result } = renderHook(
      () => useFeatureFlag('graphql.clippings', false),
      { wrapper },
    )
    expect(result.current).toBe(true)
  })

  it('test_useFeatureFlag_returns_false_when_growthbook_returns_false', () => {
    const wrapper = withGrowthBook({
      getFeatureValue: vi.fn().mockReturnValue(false),
    })
    const { result } = renderHook(
      () => useFeatureFlag('graphql.clippings', true),
      { wrapper },
    )
    expect(result.current).toBe(false)
  })

  it('test_useFeatureFlag_falls_back_to_default_when_growthbook_unavailable', () => {
    mockIsGrowthBookConfigured.mockReturnValue(false)
    const wrapper = withGrowthBook({
      getFeatureValue: vi.fn().mockReturnValue(true),
    })
    const { result } = renderHook(
      () => useFeatureFlag('graphql.clippings', false),
      { wrapper },
    )
    // GrowthBook não está configurado: deve retornar o default explícito (false)
    expect(result.current).toBe(false)
  })

  it('test_useFeatureFlag_falls_back_to_default_when_value_is_not_boolean', () => {
    const wrapper = withGrowthBook({
      getFeatureValue: vi.fn().mockReturnValue(undefined),
    })
    const { result } = renderHook(
      () => useFeatureFlag('graphql.unknown', false),
      { wrapper },
    )
    expect(result.current).toBe(false)
  })

  it('test_useFeatureFlag_falls_back_to_false_for_graphql_flags_by_default', () => {
    // Simula chave não definida no GrowthBook (retorna o defaultValue passado).
    const wrapper = withGrowthBook({
      getFeatureValue: vi
        .fn()
        .mockImplementation(
          (_key: string, defaultValue: unknown) => defaultValue,
        ),
    })

    for (const flag of Object.values(GRAPHQL_FLAGS)) {
      const { result } = renderHook(() => useFeatureFlag(flag, false), {
        wrapper,
      })
      expect(result.current).toBe(false)
    }
  })

  // --- Regressão: race condition do provider durante init ---
  //
  // Antes do fix, `useFeatureFlag` chamava `useFeatureValue` do
  // `@growthbook/growthbook-react`, que THROWA "Missing or invalid
  // GrowthBookProvider" quando não há provider ancestor — exatamente o que
  // acontecia durante o intervalo entre o initial render do
  // `GrowthBookProvider` customizado e o `setGrowthbook(gb)` no `useEffect`.
  // Esses testes garantem que o hook NUNCA propaga essa exceção.

  it('test_useFeatureFlag_no_provider_does_not_throw_and_returns_default', () => {
    // Renderiza SEM nenhum GrowthBookContext.Provider ancestor — replica o
    // estado em que o portal estava renderizando children sem `<GBProvider>`
    // antes da instância carregar.
    expect(() => {
      renderHook(() => useFeatureFlag('graphql.clippings', false))
    }).not.toThrow()

    const { result } = renderHook(() =>
      useFeatureFlag('graphql.clippings', false),
    )
    expect(result.current).toBe(false)
  })

  it('test_useFeatureFlag_no_provider_returns_default_true', () => {
    // Mesma coisa que acima, mas com defaultValue=true — garante que o
    // fallback respeita o default passado, não retorna sempre `false`.
    const { result } = renderHook(() =>
      useFeatureFlag('graphql.clippings', true),
    )
    expect(result.current).toBe(true)
  })

  it('test_useFeatureFlag_provider_present_but_growthbook_initializing_returns_default', () => {
    // Simula o estado intermédio: existe um Provider, mas a instância
    // ainda é `undefined` (GrowthBook ainda não inicializou). O type do
    // `GrowthBookContextValue` no SDK marca `growthbook` como obrigatório,
    // mas em runtime esse é exactamente o cenário do bug — por isso o cast.
    function NotReadyProvider({ children }: { children: ReactNode }) {
      return createElement(
        GrowthBookContext.Provider,
        // biome-ignore lint/suspicious/noExplicitAny: reproduz cenário runtime onde growthbook é undefined
        { value: {} as any },
        children,
      )
    }
    const { result } = renderHook(
      () => useFeatureFlag('graphql.clippings', false),
      { wrapper: NotReadyProvider },
    )
    expect(result.current).toBe(false)
  })
})

describe('getFeatureFlag (server-side)', () => {
  beforeEach(() => {
    mockIsGrowthBookConfigured.mockReset()
    mockIsGrowthBookConfigured.mockReturnValue(true)
  })

  it('test_getFeatureFlag_returns_default_when_gb_instance_is_null', () => {
    const result = getFeatureFlag('graphql.clippings', false, null)
    expect(result).toBe(false)
  })

  it('test_getFeatureFlag_returns_default_when_gb_instance_is_undefined', () => {
    const result = getFeatureFlag('graphql.clippings', false)
    expect(result).toBe(false)
  })

  it('test_getFeatureFlag_returns_value_from_gb_instance', () => {
    const fakeGB = {
      getFeatureValue: vi.fn().mockReturnValue(true),
    } as unknown as Parameters<typeof getFeatureFlag>[2]
    const result = getFeatureFlag('graphql.clippings', false, fakeGB)
    expect(result).toBe(true)
  })

  it('test_getFeatureFlag_falls_back_to_default_when_growthbook_unavailable', () => {
    mockIsGrowthBookConfigured.mockReturnValue(false)
    const fakeGB = {
      getFeatureValue: vi.fn().mockReturnValue(true),
    } as unknown as Parameters<typeof getFeatureFlag>[2]
    const result = getFeatureFlag('graphql.clippings', false, fakeGB)
    expect(result).toBe(false)
  })

  it('test_getFeatureFlag_falls_back_to_default_when_gb_throws', () => {
    const fakeGB = {
      getFeatureValue: vi.fn().mockImplementation(() => {
        throw new Error('boom')
      }),
    } as unknown as Parameters<typeof getFeatureFlag>[2]
    const result = getFeatureFlag('graphql.clippings', false, fakeGB)
    expect(result).toBe(false)
  })
})

describe('GRAPHQL_FLAGS constants', () => {
  it('test_graphql_flags_contains_expected_keys', () => {
    expect(GRAPHQL_FLAGS.CLIPPINGS).toBe('graphql.clippings')
    expect(GRAPHQL_FLAGS.MARKETPLACE).toBe('graphql.marketplace')
    expect(GRAPHQL_FLAGS.AGENT).toBe('graphql.agent')
    expect(GRAPHQL_FLAGS.PUSH).toBe('graphql.push')
    expect(GRAPHQL_FLAGS.WIDGETS).toBe('graphql.widgets')
  })

  it('test_graphql_flags_are_namespaced', () => {
    for (const flag of Object.values(GRAPHQL_FLAGS)) {
      expect(flag.startsWith('graphql.')).toBe(true)
    }
  })
})
