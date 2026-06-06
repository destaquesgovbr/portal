/**
 * Tipos compartilhados do serviço de widgets (REST e GraphQL).
 *
 * Reflete o shape público retornado pelas rotas `/api/widgets/*` —
 * `agencies` e `themes` são listas de strings (chaves) no GraphQL e
 * de objetos `{key, name, type}` / `{key, name}` no REST. O facade
 * normaliza para a forma usada pela UI.
 */

export interface WidgetAgencyOption {
  key: string
  name: string
  type: string
}

export interface WidgetThemeOption {
  key: string
  name: string
  hierarchyPath?: string
}

export interface WidgetConfigData {
  agencies: WidgetAgencyOption[]
  themes: WidgetThemeOption[]
}

/**
 * Filtros aplicados ao widget de artigos.
 *
 * `themes` é opcional para refletir a query do REST (somente `agency` e
 * `category`/themes filtram resultados).
 */
export interface WidgetArticlesFilter {
  agencies?: string[]
  themes?: string[]
  limit?: number
  page?: number
}

export interface WidgetPagination {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

// Mantemos o `article` como `unknown` para não duplicar o ArticleRow.
// O GraphQL traz campos em camelCase; o REST já trás camelCase também.
export interface WidgetArticlesData {
  articles: unknown[]
  pagination: WidgetPagination
}
