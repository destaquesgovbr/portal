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
}

export type TagFacet = {
  value: string
  count: number
}
