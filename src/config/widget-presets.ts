import type { WidgetLayout, WidgetSize } from '@/types/widget'

/**
 * Preset de dimensões para cada combinação de layout/size
 */
export type WidgetPreset = {
  width: number
  height: number
  articlesDefault: number
}

/**
 * Mapa de presets de widget por layout e tamanho
 */
export const WIDGET_PRESETS: Record<
  WidgetLayout,
  Record<WidgetSize, WidgetPreset>
> = {
  list: {
    small: { width: 300, height: 400, articlesDefault: 5 },
    medium: { width: 400, height: 600, articlesDefault: 10 },
    large: { width: 500, height: 800, articlesDefault: 15 },
    custom: { width: 400, height: 600, articlesDefault: 10 }, // fallback
  },
  'grid-2': {
    small: { width: 600, height: 400, articlesDefault: 6 },
    medium: { width: 700, height: 600, articlesDefault: 10 },
    large: { width: 800, height: 800, articlesDefault: 14 },
    custom: { width: 700, height: 600, articlesDefault: 10 },
  },
  'grid-3': {
    small: { width: 900, height: 400, articlesDefault: 9 },
    medium: { width: 1000, height: 600, articlesDefault: 12 },
    large: { width: 1200, height: 800, articlesDefault: 18 },
    custom: { width: 1000, height: 600, articlesDefault: 12 },
  },
  carousel: {
    small: { width: 400, height: 300, articlesDefault: 5 },
    medium: { width: 700, height: 400, articlesDefault: 10 },
    large: { width: 1000, height: 500, articlesDefault: 15 },
    custom: { width: 700, height: 400, articlesDefault: 10 },
  },
}

/**
 * Labels amigáveis para layouts
 */
export const WIDGET_LAYOUT_LABELS: Record<WidgetLayout, string> = {
  list: 'Lista Vertical',
  'grid-2': 'Grade 2 Colunas',
  'grid-3': 'Grade 3 Colunas',
  carousel: 'Carrossel',
}

/**
 * Labels amigáveis para tamanhos
 */
export const WIDGET_SIZE_LABELS: Record<WidgetSize, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
  custom: 'Customizado',
}

/**
 * Descrições para cada layout
 */
export const WIDGET_LAYOUT_DESCRIPTIONS: Record<WidgetLayout, string> = {
  list: 'Lista vertical de notícias, ideal para sidebars e espaços estreitos',
  'grid-2':
    'Grade de 2 colunas responsiva, ideal para seções de conteúdo principal',
  'grid-3': 'Grade de 3 colunas full-width, ideal para hero sections',
  carousel:
    'Carrossel horizontal com navegação, ideal para destaques rotativos',
}
