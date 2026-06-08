import { auth } from '@/auth'
import { Badge } from '@/components/ui/badge'
import { createSSRClient } from '@/lib/graphql/client'
import { createGraphQLContentService } from '@/services/content/graphql'

export const revalidate = 600

type Props = { params: Promise<{ releaseId: string }> }

export async function generateMetadata() {
  return { title: 'Artigos da edição — DestaquesGovBr' }
}

export default async function ReleaseArticlesPage({ params }: Props) {
  const { releaseId } = await params

  // Cliente SSR com o token da sessão para que releases privadas
  // (autor/assinante) resolvam; releases públicas funcionam sem token.
  const session = await auth()
  const content = createGraphQLContentService(
    createSSRClient(async () => session?.accessToken ?? null),
  )

  // O resolver busca os recortes da release, consulta os artigos por keyword,
  // deduplica, ordena desc e aplica a janela refTime/sinceHours no servidor.
  const articles = await content.getReleaseArticles(releaseId)

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Artigos da edição</h1>

      <div className="mt-4 rounded-md border p-4 bg-muted/30 text-sm text-muted-foreground space-y-2">
        <p>
          Estes são os <strong>{articles.length} artigos</strong> que foram
          considerados para a edição deste clipping.
        </p>
        <p>
          Os artigos são selecionados automaticamente a partir dos recortes
          configurados no clipping. Cada recorte define filtros independentes
          (tema, órgão ou palavra-chave) combinados com lógica OR — um artigo
          que satisfaça qualquer recorte é incluído.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {articles.map((article) => (
          <a
            key={article.unique_id}
            href={article.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border p-4 hover:shadow-sm transition-shadow"
          >
            <h2 className="text-sm font-medium leading-snug">
              {article.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {article.agency && (
                <Badge className="text-xs border-border bg-background">
                  {article.agency}
                </Badge>
              )}
              {article.theme_1_level_1_label && (
                <Badge className="text-xs">
                  {article.theme_1_level_1_label}
                </Badge>
              )}
              {article.published_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(article.published_at * 1000).toLocaleDateString(
                    'pt-BR',
                    { day: '2-digit', month: '2-digit', year: 'numeric' },
                  )}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>

      {articles.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          Nenhum artigo encontrado para esta edição.
        </p>
      )}
    </div>
  )
}
