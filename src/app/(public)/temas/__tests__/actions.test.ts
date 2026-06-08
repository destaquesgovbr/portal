/**
 * Testes da server action `getThemeArticleCounts` (migração Fase 2B).
 *
 * Verifica que: (a) consulta os 3 níveis com janela de 30 dias, (b) mescla os
 * resultados num único `Map<code, count>`, (c) ignora códigos vazios/`null`,
 * (d) devolve um Map vazio quando o facade lança erro.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ThemeCount } from '@/services/content'

const getThemeArticleCountsMock =
  vi.fn<(days?: number, level?: number) => Promise<ThemeCount[]>>()

vi.mock('@/lib/graphql/client', () => ({
  createSSRClient: () => ({}) as unknown,
}))

vi.mock('@/services/content', () => ({
  getContentService: () => ({
    getThemeArticleCounts: getThemeArticleCountsMock,
  }),
}))

import { getThemeArticleCounts } from '../actions'

beforeEach(() => {
  getThemeArticleCountsMock.mockReset()
})

describe('getThemeArticleCounts', () => {
  it('consulta os 3 níveis (30 dias) e mescla num único Map code→count', async () => {
    getThemeArticleCountsMock.mockImplementation(
      async (_days?: number, level?: number) => {
        if (level === 1) return [{ code: '01', label: 'L1', count: 10 }]
        if (level === 2) return [{ code: '0101', label: 'L2', count: 5 }]
        return [{ code: '010101', label: 'L3', count: 2 }]
      },
    )

    const result = await getThemeArticleCounts()

    expect(getThemeArticleCountsMock).toHaveBeenCalledWith(30, 1)
    expect(getThemeArticleCountsMock).toHaveBeenCalledWith(30, 2)
    expect(getThemeArticleCountsMock).toHaveBeenCalledWith(30, 3)
    expect(result).toBeInstanceOf(Map)
    expect(result.get('01')).toBe(10)
    expect(result.get('0101')).toBe(5)
    expect(result.get('010101')).toBe(2)
    expect(result.size).toBe(3)
  })

  it('ignora códigos vazios, "null" e string vazia', async () => {
    getThemeArticleCountsMock.mockResolvedValue([
      { code: '01', label: 'ok', count: 7 },
      { code: 'null', label: 'x', count: 3 },
      { code: '', label: 'y', count: 1 },
    ])

    const result = await getThemeArticleCounts()

    expect(result.get('01')).toBe(7)
    expect(result.has('null')).toBe(false)
    expect(result.has('')).toBe(false)
    expect(result.size).toBe(1)
  })

  it('devolve Map vazio quando o facade lança erro', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getThemeArticleCountsMock.mockRejectedValue(new Error('boom'))

    const result = await getThemeArticleCounts()

    expect(result).toBeInstanceOf(Map)
    expect(result.size).toBe(0)
    spy.mockRestore()
  })
})
