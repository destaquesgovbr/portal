import { z } from 'zod'

/**
 * Layout types para o widget
 */
export const WidgetLayoutSchema = z.enum([
  'list',
  'grid-2',
  'grid-3',
  'carousel',
])
export type WidgetLayout = z.infer<typeof WidgetLayoutSchema>

/**
 * Size presets para o widget
 */
export const WidgetSizeSchema = z.enum(['small', 'medium', 'large', 'custom'])
export type WidgetSize = z.infer<typeof WidgetSizeSchema>

/**
 * Configuração completa do widget
 */
export const WidgetConfigSchema = z
  .object({
    // Filtros de conteúdo
    agencies: z
      .array(z.string())
      .max(20, 'Máximo de 20 agências')
      .optional()
      .default([]),
    themes: z
      .array(z.string())
      .max(10, 'Máximo de 10 temas')
      .optional()
      .default([]),

    // Layout e aparência
    layout: WidgetLayoutSchema.default('list'),
    size: WidgetSizeSchema.default('medium'),

    // Dimensões customizadas (obrigatórias se size === 'custom')
    width: z
      .number()
      .min(200, 'Largura mínima: 200px')
      .max(2000, 'Largura máxima: 2000px')
      .optional(),
    height: z
      .number()
      .min(200, 'Altura mínima: 200px')
      .max(2000, 'Altura máxima: 2000px')
      .optional(),

    // Opções de branding e exibição
    showLogo: z.boolean().default(true),
    showLink: z.boolean().default(true),
    showTooltip: z.boolean().default(true),
    articlesPerPage: z
      .number()
      .min(5, 'Mínimo de 5 artigos')
      .max(50, 'Máximo de 50 artigos')
      .default(10),
  })
  .refine(
    (data) => {
      // Se size === 'custom', width e height são obrigatórios
      if (data.size === 'custom') {
        return data.width !== undefined && data.height !== undefined
      }
      return true
    },
    {
      message:
        'Largura e altura são obrigatórias quando o tamanho é customizado',
      path: ['width'],
    },
  )

export type WidgetConfig = z.infer<typeof WidgetConfigSchema>

/**
 * Preset de dimensões para um tamanho específico e layout
 */
export type WidgetDimensions = {
  width: number
  height: number
  articlesDefault: number
}

/**
 * Resposta da API de artigos
 */
export const WidgetArticlesResponseSchema = z.object({
  articles: z.array(z.any()), // ArticleRow[]
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
  filters: z.object({
    agencies: z.array(z.string()),
    themes: z.array(z.string()),
  }),
})

export type WidgetArticlesResponse = z.infer<
  typeof WidgetArticlesResponseSchema
>

/**
 * Resposta da API de configuração
 */
export const WidgetConfigResponseSchema = z.object({
  agencies: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      type: z.string(),
    }),
  ),
  themes: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      hierarchyPath: z.string().optional(),
    }),
  ),
})

export type WidgetConfigResponse = z.infer<typeof WidgetConfigResponseSchema>
