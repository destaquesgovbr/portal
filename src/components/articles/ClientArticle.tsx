'use client'

import {
  ArrowLeft,
  Calendar,
  Check,
  ExternalLink,
  Share2,
  Tag,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import NewsCard from '@/components/articles/NewsCard'
import { VideoPlayer } from '@/components/articles/VideoPlayer'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import type { ArticleRow } from '@/types/article'

export default function ClientArticle({
  article,
  baseUrl,
  pageUrl,
  similarArticles,
}: {
  article: ArticleRow
  baseUrl: string
  pageUrl: string
  similarArticles: ArticleRow[]
}) {
  const [copied, setCopied] = useState(false)
  const [coverImageBroken, setCoverImageBroken] = useState(false)

  // Check if the cover image appears in the article body
  const isImageInBody = useMemo(() => {
    if (!article.image || !article.content) return false
    return article.content.includes(article.image)
  }, [article.image, article.content])

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title || '',
          url: pageUrl,
        })
      } else {
        await navigator.clipboard.writeText(pageUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err)
    }
  }

  return (
    <main className="py-16 overflow-hidden">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Botão de voltar */}
        <div className="mb-8">
          <Link href="/artigos">
            <Button
              variant="ghost"
              className="text-primary/80 hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às notícias
            </Button>
          </Link>
        </div>

        {/* Cabeçalho */}
        <header className="text-center mb-12">
          {/* Metadados */}
          <div className="flex flex-wrap justify-center items-center gap-3 mb-4 text-sm text-primary/70">
            {article.theme_1_level_3_label && (
              <Badge className="bg-white text-primary/90 font-medium">
                <Tag className="w-3 h-3 mr-1 text-primary/70" />
                {article.theme_1_level_3_label}
              </Badge>
            )}

            {article.published_at && (
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-primary/60" />
                {formatDateTime(article.published_at)}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-primary/70 hover:text-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-[#2D9B78]" />
                  Link copiado!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-1" />
                  Compartilhar
                </>
              )}
            </Button>
          </div>

          {/* Editorial Lead - aparece como tag acima do título */}
          {article.editorial_lead && (
            <p className="text-sm font-semibold text-primary/70 uppercase tracking-wide mb-2">
              {article.editorial_lead}
            </p>
          )}

          {/* Título */}
          <h1 className="text-3xl md:text-4xl font-bold text-primary leading-tight mb-4">
            {article.title}
          </h1>

          {/* Subtítulo */}
          {article.subtitle && (
            <p className="text-base md:text-lg text-primary/70 mb-6 max-w-3xl mx-auto leading-relaxed">
              {article.subtitle}
            </p>
          )}

          {/* Linha divisória SVG */}
          <div className="mx-auto mt-3 w-40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="180"
              height="6"
              viewBox="0 0 180 6"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="22" height="6" fill="#0D4C92" />
              <path d="M22 0 L38 6 L54 0 Z" fill="#2D9B78" />
              <rect x="54" y="0" width="28" height="6" fill="#F9C80E" />
              <circle cx="96" cy="3" r="3" fill="#E63946" />
              <path d="M110 0 L122 6 L134 6 L122 0 Z" fill="#0D4C92" />
              <rect x="134" y="0" width="46" height="6" fill="#2D9B78" />
            </svg>
          </div>
        </header>

        {/* Video takes priority over cover image */}
        {article.video_url ? (
          <VideoPlayer videoUrl={article.video_url} title={article.title} />
        ) : (
          /* Imagem de capa - only show if image is NOT repeated in body */
          article.image &&
          !isImageInBody &&
          !coverImageBroken && (
            <div className="mb-12">
              <img
                src={article.image}
                alt={article.title || ''}
                width={992}
                height={384}
                className="w-full h-64 md:h-96 object-cover rounded-lg shadow-md"
                onError={() => setCoverImageBroken(true)}
              />
            </div>
          )
        )}

        {/* Corpo do artigo */}
        <article className="prose prose-lg mx-auto max-w-3xl text-primary/90 leading-relaxed article-content">
          <MarkdownRenderer content={article.content ?? ''} />
        </article>

        {/* Botão CTA para notícia original */}
        {article.url && (
          <div className="flex justify-center my-12">
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-[#0D4C92] hover:bg-[#0D4C92]/90 text-white text-base px-8 py-6 rounded-lg shadow-md"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Ler notícia completa em {baseUrl}
              </Button>
            </a>
          </div>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <section className="mt-12 mb-8 max-w-3xl mx-auto">
            <h2 className="text-sm font-semibold text-primary/70 uppercase tracking-wide mb-3">
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/artigos?tags=${encodeURIComponent(tag)}`}
                >
                  <Badge className="bg-white text-primary font-medium hover:bg-primary/5 transition-colors cursor-pointer">
                    <Tag className="w-3 h-3 mr-1 text-primary/70" />
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Notícias similares */}
        {similarArticles.length > 0 && (
          <section className="mt-16 border-t pt-10">
            <h2 className="text-xl font-semibold text-primary mb-6">
              Notícias relacionadas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarArticles.map((similar) => (
                <NewsCard
                  key={similar.unique_id}
                  title={similar.title || ''}
                  summary={similar.summary || undefined}
                  theme={similar.most_specific_theme_label || ''}
                  internalUrl={`/artigos/${similar.unique_id}`}
                  date={similar.published_at}
                  imageUrl={similar.image || undefined}
                  trackingOrigin="similar"
                />
              ))}
            </div>
          </section>
        )}

        {/* Rodapé */}
        <footer className="mt-16 border-t pt-8 text-primary/70 text-sm space-y-4">
          <div>
            <strong>Fonte:</strong> {article.agency}
          </div>

          {article.url && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Fonte oficial:</span>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {baseUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <p className="text-xs text-primary/60 pt-4">
            Esta notícia foi publicada no portal oficial do Governo Federal do
            Brasil. Todas as informações são de responsabilidade do órgão
            emissor.
          </p>
        </footer>
      </div>
    </main>
  )
}
