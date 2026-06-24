/** Entidade nomeada extraída do conteúdo (NER). type: ORG/PER/LOC/EVENT/POLICY/… */
export type ArticleEntity = {
  text: string
  type: string
  count: number
  /** Id canônico (`Q…`/`dgb_…`) da entidade; `null` até canonicalizar. */
  canonical_id?: string | null
  /** Saliência [0,1] emitida pelo LLM; `null` quando ausente. */
  salience?: number | null
}

/**
 * Anotação de span inline (lente semântica). Offsets char em `content`,
 * derivados deterministicamente no feature-worker. `canonical_id` liga ao
 * `entity_registry` quando disponível.
 */
export type ContentAnnotation = {
  start: number
  end: number
  type: string
  text: string
  canonical_id?: string | null
}

/** Features computadas (news_features), expostas no detalhe do artigo. */
export type ArticleFeatures = {
  entities: ArticleEntity[]
  /** Spans inline para a lente semântica (vazio até a derivação rodar). */
  content_annotations?: ContentAnnotation[]
  view_count: number | null
  unique_sessions: number | null
  trending_score: number | null
  word_count: number | null
  readability_flesch: number | null
}

export type ArticleRow = {
  unique_id: string
  agency: string | null
  published_at: number | null
  title: string | null
  url: string | null
  image: string | null
  video_url: string | null
  category: string | null
  content: string | null
  summary: string | null
  subtitle: string | null
  editorial_lead: string | null
  extracted_at: number | null
  theme_1_level_1_code: string | null
  theme_1_level_1_label: string | null
  theme_1_level_2_code: string | null
  theme_1_level_2_label: string | null
  theme_1_level_3_code: string | null
  theme_1_level_3_label: string | null
  most_specific_theme_code: string | null
  most_specific_theme_label: string | null
  published_year: number | null
  published_month: number | null
  published_week: number | null
  tags: string[] | null
  // Manter theme_1_level_1 como alias para compatibilidade
  theme_1_level_1?: string | null
  // Features computadas — presentes apenas no detalhe do artigo (ARTICLE_QUERY).
  features?: ArticleFeatures | null
}

export type TagFacet = {
  value: string
  count: number
}
