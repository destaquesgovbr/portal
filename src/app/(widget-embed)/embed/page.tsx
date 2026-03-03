import { WidgetContainer } from '@/components/widgets/WidgetContainer'
import { WidgetContent } from '@/components/widgets/WidgetContent'
import { WidgetError } from '@/components/widgets/WidgetError'
import { WidgetFooter } from '@/components/widgets/WidgetFooter'
import { WidgetNewsCard } from '@/components/widgets/WidgetNewsCard'
import { decodeWidgetConfig } from '@/lib/widget-utils'
import type { WidgetConfig } from '@/types/widget'
import { type FetchWidgetArticlesResult, fetchWidgetArticles } from './actions'

// Cache ISR de 5 minutos
export const revalidate = 300

interface EmbedPageProps {
  searchParams: Promise<{ c?: string }>
}

export default async function WidgetEmbedPage({
  searchParams,
}: EmbedPageProps) {
  const params = await searchParams
  const configParam = params.c

  // Valida se config existe
  if (!configParam) {
    return (
      <div className="p-4">
        <WidgetError message="Parâmetro de configuração não fornecido. Use ?c=<config-base64>" />
      </div>
    )
  }

  // Decodifica e valida config
  let config: WidgetConfig
  try {
    config = decodeWidgetConfig(configParam)
  } catch (error) {
    return (
      <div className="p-4">
        <WidgetError
          message={
            error instanceof Error
              ? error.message
              : 'Configuração inválida ou corrompida.'
          }
        />
      </div>
    )
  }

  // Busca artigos
  let result: FetchWidgetArticlesResult
  try {
    result = await fetchWidgetArticles(config)
  } catch (_error) {
    return (
      <div className="p-4">
        <WidgetError
          title="Erro ao buscar notícias"
          message="Não foi possível carregar as notícias. Tente novamente mais tarde."
        />
      </div>
    )
  }

  const { articles, agencyNames, themeNames } = result

  // Se não há artigos
  if (articles.length === 0) {
    return (
      <WidgetContainer config={config}>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center">
            Nenhuma notícia encontrada com os filtros selecionados.
          </p>
        </div>
        <WidgetFooter
          config={{
            agencies: config.agencies,
            themes: config.themes,
            showLogo: config.showLogo,
            showLink: config.showLink,
            showTooltip: config.showTooltip,
          }}
          agencyNames={agencyNames}
          themeNames={themeNames}
        />
      </WidgetContainer>
    )
  }

  const isCompactSize = config.size === 'small'

  return (
    <WidgetContainer config={config}>
      <WidgetContent layout={config.layout}>
        {articles.map((article) => (
          <WidgetNewsCard
            key={article.unique_id}
            title={article.title ?? 'Sem título'}
            summary={article.summary ?? undefined}
            theme={article.theme_1_level_1_label ?? undefined}
            internalUrl={`https://destaques.gov.br/artigos/${article.unique_id}`}
            date={article.published_at ?? null}
            imageUrl={article.image ?? undefined}
            compact={isCompactSize}
          />
        ))}
      </WidgetContent>

      <WidgetFooter
        config={{
          agencies: config.agencies,
          themes: config.themes,
          showLogo: config.showLogo,
          showLink: config.showLink,
          showTooltip: config.showTooltip,
        }}
        agencyNames={agencyNames}
        themeNames={themeNames}
      />
    </WidgetContainer>
  )
}
