/**
 * Cabeçalho do detalhe de tema (`/temas/[label]`).
 *
 * Regressão: `THEME_ICONS[themeLabel].image` sem null-check derrubava a página
 * inteira para qualquer label fora do mapa (tema novo como o 26 antes do ícone,
 * L1 removido como 22/23, URL digitada à mão). Agora cai num ícone genérico.
 */

import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/__tests__/test-utils'
import { THEME_ICON_FALLBACK } from '@/data/themes'
import ThemePageClient from '../ThemePageClient'

const getArticlesMock = vi.fn()

vi.mock('../actions', () => ({
  getArticles: (...args: unknown[]) => getArticlesMock(...args),
}))

// Filtros e scroll infinito não importam aqui: stubs mínimos.
vi.mock('@/components/articles/ArticleFilters', () => ({
  ArticleFilters: () => <aside data-testid="filters" />,
}))
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn() }),
}))

beforeEach(() => {
  getArticlesMock.mockReset()
  getArticlesMock.mockResolvedValue({ articles: [], page: null })
})

function renderTheme(themeLabel: string, themeCode?: string) {
  return render(
    <ThemePageClient
      themeLabel={themeLabel}
      themeCode={themeCode}
      agencies={[]}
    />,
  )
}

describe('ThemePageClient — cabeçalho', () => {
  it('renderiza com o ícone genérico quando o tema não tem ícone', async () => {
    renderTheme('Tema Inexistente')

    expect(
      screen.getByRole('heading', { name: 'Tema Inexistente' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Tema Inexistente' }),
    ).toHaveAttribute('src', THEME_ICON_FALLBACK.image)
    await waitFor(() =>
      expect(
        screen.getByText('Nenhum artigo encontrado para este tema no momento.'),
      ).toBeInTheDocument(),
    )
  })

  it('não quebra para um L1 removido da taxonomia (22 — Eventos Oficiais)', () => {
    renderTheme('Eventos Oficiais e Cerimônias')

    expect(
      screen.getByRole('img', { name: 'Eventos Oficiais e Cerimônias' }),
    ).toHaveAttribute('src', THEME_ICON_FALLBACK.image)
  })

  it('usa o ícone e a descrição do tema 26', () => {
    renderTheme('Defesa Civil e Gestão de Desastres', '26')

    expect(
      screen.getByRole('img', { name: 'Defesa Civil e Gestão de Desastres' }),
    ).toHaveAttribute('src', '/26-defesa-civil-e-gestao-de-desastres.svg')
    expect(screen.getByText(/abrigo/i)).toBeInTheDocument()
  })

  it('consulta os artigos pelo label do L1', async () => {
    renderTheme('Defesa Civil e Gestão de Desastres', '26')

    await waitFor(() => expect(getArticlesMock).toHaveBeenCalled())
    expect(getArticlesMock.mock.calls[0][0]).toMatchObject({
      page: 1,
      theme_1_level_1: 'Defesa Civil e Gestão de Desastres',
    })
  })
})
