/**
 * Testes do wrapper de feature flags (PLANO-ATUALIZACAO-v2, Fase B1).
 *
 * Cobre:
 *   - `useFeatureFlag(key, defaultValue)`: leitura client-side com fail-safe.
 *   - `getFeatureFlag(key, defaultValue, gb)`: leitura server-side.
 *   - Constante `GRAPHQL_FLAGS`: chaves planejadas para B2-B5.
 */

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks devem ser declarados ANTES dos imports do módulo testado.
const mockUseFeatureValue = vi.fn()
const mockIsGrowthBookConfigured = vi.fn(() => true)

vi.mock('@growthbook/growthbook-react', () => ({
  useFeatureValue: (key: string, defaultValue: unknown) =>
    mockUseFeatureValue(key, defaultValue),
}))

vi.mock('@/ab-testing/growthbook', () => ({
  isGrowthBookConfigured: () => mockIsGrowthBookConfigured(),
}))

import { GRAPHQL_FLAGS, getFeatureFlag, useFeatureFlag } from '../feature-flags'

describe('useFeatureFlag', () => {
  beforeEach(() => {
    mockUseFeatureValue.mockReset()
    mockIsGrowthBookConfigured.mockReset()
    mockIsGrowthBookConfigured.mockReturnValue(true)
  })

  it('test_useFeatureFlag_returns_true_when_growthbook_returns_true', () => {
    mockUseFeatureValue.mockReturnValue(true)
    const { result } = renderHook(() =>
      useFeatureFlag('graphql.clippings', false),
    )
    expect(result.current).toBe(true)
  })

  it('test_useFeatureFlag_returns_false_when_growthbook_returns_false', () => {
    mockUseFeatureValue.mockReturnValue(false)
    const { result } = renderHook(() =>
      useFeatureFlag('graphql.clippings', true),
    )
    expect(result.current).toBe(false)
  })

  it('test_useFeatureFlag_falls_back_to_default_when_growthbook_unavailable', () => {
    mockIsGrowthBookConfigured.mockReturnValue(false)
    mockUseFeatureValue.mockReturnValue(true) // simula valor "verdadeiro" do mock
    const { result } = renderHook(() =>
      useFeatureFlag('graphql.clippings', false),
    )
    // GrowthBook não está configurado: deve retornar o default explícito (false)
    expect(result.current).toBe(false)
  })

  it('test_useFeatureFlag_falls_back_to_default_when_value_is_not_boolean', () => {
    mockUseFeatureValue.mockReturnValue(undefined as unknown as boolean)
    const { result } = renderHook(() =>
      useFeatureFlag('graphql.unknown', false),
    )
    expect(result.current).toBe(false)
  })

  it('test_useFeatureFlag_falls_back_to_false_for_graphql_flags_by_default', () => {
    // Simula chave não definida no GrowthBook (retorna o defaultValue passado).
    mockUseFeatureValue.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    )

    for (const flag of Object.values(GRAPHQL_FLAGS)) {
      const { result } = renderHook(() => useFeatureFlag(flag, false))
      expect(result.current).toBe(false)
    }
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
