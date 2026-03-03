import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import NewsCard from '@/components/articles/NewsCard'
import { Button } from '@/components/ui/button'
import THEME_ICONS from '@/data/themes'
import { formatDateTime, getExcerpt } from '@/lib/utils'
import type { ArticleRow } from '@/types/article'
import {
  countMonthlyNews,
  countTotalNews,
  getLatestArticles,
  getLatestByThemes,
  getThemes,
} from './actions'

// Revalidate every 10 minutes (600 seconds)
export const revalidate = 600

export default async function Home() {
  // ===== Fetch principal =====
  const [latestNewsResult, themesResult, newsThisMonth, totalNews] =
    await Promise.all([
      getLatestArticles(),
      getThemes(),
      countMonthlyNews(),
      countTotalNews(),
    ])

  if (themesResult.type !== 'ok') return <div>Erro ao carregar os temas.</div>
  if (latestNewsResult.type !== 'ok')
    return <div>Erro ao carregar as notícias.</div>

  const themes = themesResult.data
  const latestNews = latestNewsResult.data

  // ===== Hero: 1 manchete + 2 secundárias =====
  const [featuredMain, ...rest] = latestNews
  const featuredSide = rest.slice(0, 2)
  const featuredBottom = rest.slice(2, 4)

  // ===== Últimas notícias (prévia) =====
  const latestPreview = rest.slice(4, 10) // 6 cards em média

  // ===== Temas em foco (3 temas × 2 notícias cada) =====
  // Single query for all themes (eliminates N+1 queries)
  const focusThemes = themes.slice(0, 3)
  const themeNames = focusThemes.map((t) => t.name)
  const themesArticlesResult = await getLatestByThemes(themeNames, 2)

  const themesWithNews = focusThemes.map((t) => ({
    theme: t.name,
    articles:
      themesArticlesResult.type === 'ok'
        ? (themesArticlesResult.data[t.name] ?? [])
        : [],
  }))

  return (
    <main className="min-h-screen bg-background">
      {/* 1️⃣ HERO — destaque principal (1 grande + 2 sem imagem + 2 laterais) */}
      <section className="pt-4 md:pt-8 pb-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Manchete principal */}
          <div className="md:col-span-2 grid grid-cols-1 gap-6">
            <NewsCard
              key={featuredMain.unique_id}
              theme={featuredMain.theme_1_level_3_label || ''}
              date={featuredMain.published_at}
              internalUrl={`/artigos/${featuredMain.unique_id}`}
              imageUrl={featuredMain.image || ''}
              summary={getExcerpt(featuredMain.content || '', 250)}
              title={featuredMain.title || ''}
              isMain
              trackingOrigin="home"
            />
            {/* Duas notícias secundárias sem imagem */}
            <div className="flex gap-6">
              {featuredBottom.map((article) => (
                <NewsCard
                  key={article.unique_id}
                  theme={article.theme_1_level_3_label || ''}
                  date={article.published_at}
                  internalUrl={`/artigos/${article.unique_id}`}
                  imageUrl=""
                  summary={getExcerpt(article.content || '', 150)}
                  title={article.title || ''}
                  trackingOrigin="home"
                />
              ))}
            </div>
          </div>

          {/* Duas notícias secundárias */}
          <aside className="grid grid-cols-1 gap-6">
            {featuredSide.map(
              (article) =>
                article && (
                  <NewsCard
                    key={article.unique_id}
                    theme={article.theme_1_level_3_label || ''}
                    date={article.published_at}
                    internalUrl={`/artigos/${article.unique_id}`}
                    imageUrl={article.image || ''}
                    summary={getExcerpt(article.content || '', 150)}
                    title={article.title || ''}
                    trackingOrigin="home"
                  />
                ),
            )}
          </aside>
        </div>
      </section>

      {/* 2️⃣ ÚLTIMAS NOTÍCIAS — grade */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-start">
              <img
                src="/vertical-ribbon.svg"
                alt="decorativo"
                className="w-2 h-14 mr-4 mt-1"
              />
              <div>
                <h2 className="text-2xl font-bold">Últimas notícias</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Acompanhe as informações mais recentes sobre as ações e
                  políticas do Governo Federal.
                </p>
              </div>
            </div>
            <Link href="/artigos">
              <Button variant="outline" className="cursor-pointer">
                Ver todas
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestPreview.map((article) => (
              <NewsCard
                key={article.unique_id}
                internalUrl={`/artigos/${article.unique_id}`}
                theme={article.theme_1_level_3_label || ''}
                date={article.published_at}
                summary={getExcerpt(article.content || '', 200)}
                title={article.title || ''}
                imageUrl={article.image || ''}
                trackingOrigin="home"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3️⃣ TEMAS EM FOCO — 3 blocos com 2 notícias cada */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-start">
              <img
                src="/vertical-ribbon.svg"
                alt="decorativo"
                className="w-2 h-14 mr-4 mt-1"
              />
              <div>
                <h2 className="text-2xl font-bold">Temas em foco</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Os principais eixos de atuação e debate público, com notícias
                  recentes.
                </p>
              </div>
            </div>
            <Link href="/temas">
              <Button variant="outline" className="cursor-pointer">
                Ver todos
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {themesWithNews.map(({ theme, articles }, i) => (
              <div
                key={theme}
                className="
                  group relative rounded-xl border bg-card p-6 flex flex-col gap-4
                  overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-[2px]
                "
              >
                {/* SVG decorativo de fundo */}
                <div
                  className={`absolute inset-0 opacity-20 group-hover:opacity-30 theme-banner-${i + 1} scale-105 group-hover:scale-110 transition-all`}
                  aria-hidden="true"
                />

                {/* Conteúdo do card */}
                <div className="relative flex items-center gap-3">
                  <div className="rounded-md bg-white/90 border">
                    <img
                      src={THEME_ICONS[theme]?.image}
                      alt={theme}
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                  <Link href={`/temas/${theme}`} className="hover:underline">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {theme}
                    </h3>
                  </Link>
                </div>

                <ul className="relative space-y-2.5">
                  {articles.length > 0 ? (
                    articles.map((a: ArticleRow) => (
                      <li key={a.unique_id} className="text-sm leading-snug">
                        <Link
                          href={`/artigos/${a.unique_id}`}
                          className="text-primary hover:underline"
                          data-umami-event="article_click"
                          data-umami-event-article-id={a.unique_id}
                          data-umami-event-origin="home"
                        >
                          {a.title}
                        </Link>
                        {a.published_at && (
                          <span className="ml-2 text-muted-foreground">
                            · {formatDateTime(a.published_at)}
                          </span>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">
                      Sem notícias recentes.
                    </li>
                  )}
                </ul>

                <div className="relative mt-auto pt-2">
                  <Link href={`/temas/${theme}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="
                        group-hover:text-primary
                        group-hover:underline
                        transition-colors
                        flex
                        items-center
                        cursor-pointer
                      "
                    >
                      Ver mais
                      <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4️⃣ TRANSPARÊNCIA / DADOS PÚBLICOS — 3 cards verticais com SVG de fundo */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-start mb-8">
            <img
              src="/vertical-ribbon.svg"
              alt="decorativo"
              className="w-2 h-14 mr-4 mt-1"
            />
            <div>
              <h2 className="text-2xl font-bold">
                Transparência e dados públicos
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Acompanhe informações oficiais, dados abertos e canais de
                controle social.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <a
              href="https://portaldatransparencia.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border bg-card overflow-hidden block transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-[#0D4C92]/20 transparency-banner-1"
            >
              <div className="m-8 bg-white/80 p-3 transition-all rounded-xl group-hover:bg-white/90 duration-300 group-hover:-translate-y-[2px] group-hover:shadow-sm">
                <h3 className="font-semibold text-lg transition-colors duration-300 group-hover:text-primary">
                  Portal da Transparência
                </h3>
                <p className="text-sm mt-1 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                  Consulte gastos públicos e execução orçamentária.
                </p>
              </div>
            </a>

            {/* Card 2 */}
            <a
              href="https://dados.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border bg-card overflow-hidden block transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-[#0D4C92]/20 transparency-banner-2"
            >
              <div className="m-8 bg-white/80 p-3 transition-all rounded-xl group-hover:bg-white/90 duration-300 group-hover:-translate-y-[2px] group-hover:shadow-sm">
                <h3 className="font-semibold text-lg transition-colors duration-300 group-hover:text-primary">
                  Dados Abertos
                </h3>
                <p className="text-sm mt-1 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                  Catálogo de bases e APIs públicas do governo federal.
                </p>
              </div>
            </a>

            {/* Card 3 */}
            <a
              href="https://www.gov.br/ouvidorias"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border bg-card overflow-hidden block transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-[#0D4C92]/20 transparency-banner-3"
            >
              <div className="m-8 bg-white/80 p-3 transition-all rounded-xl group-hover:bg-white/90 duration-300 group-hover:-translate-y-[2px] group-hover:shadow-sm">
                <h3 className="font-semibold text-lg transition-colors duration-300 group-hover:text-primary">
                  Ouvidoria
                </h3>
                <p className="text-sm mt-1 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                  Registre manifestações e acompanhe o retorno dos órgãos.
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* 5️⃣ ESTATÍSTICAS RÁPIDAS */}
      <section className="pt-12 pb-28 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-start">
              <img
                src="/vertical-ribbon.svg"
                alt="decorativo"
                className="w-2 h-14 mr-4 mt-1"
              />
              <div>
                <h2 className="text-2xl font-bold">Dados editoriais</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Acompanhe a distribuição de temas, órgãos e publicações no
                  ecossistema oficial de notícias do Governo Federal.
                </p>
              </div>
            </div>

            <Link href="/dados-editoriais">
              <Button variant="outline" className="cursor-pointer">
                Ver todos
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-government-red mb-1">
                {new Intl.NumberFormat('pt-BR').format(newsThisMonth.data ?? 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Notícias publicadas este mês
              </div>
            </div>
            <div className="border-l md:border-l md:pl-8">
              <div className="text-3xl font-bold text-government-blue mb-1">
                {new Intl.NumberFormat('pt-BR').format(totalNews.data ?? 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total de notícias no portal
              </div>
            </div>
            <div className="border-l md:border-l md:pl-8">
              <div className="text-3xl font-bold text-government-green mb-1">
                31
              </div>
              <div className="text-sm text-muted-foreground">
                Ministérios ativos
              </div>
            </div>
            <div className="border-l md:border-l md:pl-8">
              <div className="text-3xl font-bold text-government-blue mb-1">
                24h
              </div>
              <div className="text-sm text-muted-foreground">
                Atualização contínua
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
