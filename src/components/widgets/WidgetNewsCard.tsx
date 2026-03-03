import { Calendar, Tag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'

interface WidgetNewsCardProps {
  title: string
  summary?: string
  theme?: string
  internalUrl: string
  date?: number | null
  imageUrl?: string
  compact?: boolean
}

export function WidgetNewsCard({
  title,
  summary,
  theme,
  internalUrl,
  date,
  imageUrl,
  compact = false,
}: WidgetNewsCardProps) {
  const hasTheme = Boolean(theme && theme.trim() !== '')
  const articleId = internalUrl.split('/').pop() || ''

  return (
    <Link
      href={internalUrl}
      className="h-full"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="news-card"
      data-umami-event="widget_article_click"
      data-umami-event-article-id={articleId}
      data-umami-event-origin="widget_embed"
    >
      <Card className="transition-all overflow-hidden duration-300 h-full cursor-pointer group hover:shadow-md hover:scale-[1.01] bg-card">
        {/* Imagem de capa */}
        {imageUrl && !compact && (
          <div className="relative overflow-hidden h-32">
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />

            {/* Badge de tema (somente se existir) */}
            {hasTheme && (
              <div className="absolute top-2 left-2">
                <div className="bg-white/90 backdrop-blur-sm text-primary text-xs font-medium px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                  <Tag className="w-3 h-3 text-primary/70" />
                  {theme}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cabeçalho */}
        <CardHeader className="p-3">
          {/* Badge caso não haja imagem ou seja compact */}
          {(!imageUrl || compact) && hasTheme && (
            <div className="mb-2 bg-muted text-primary/90 text-xs font-medium px-2 py-1 rounded-md inline-flex items-center gap-1 w-fit">
              <Tag className="w-3 h-3 text-primary/70" />
              {theme}
            </div>
          )}

          {/* Título */}
          <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </CardHeader>

        {/* Conteúdo */}
        {!compact && (
          <CardContent className="px-3 pb-3">
            {summary && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {summary}
              </p>
            )}

            {date && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="w-3 h-3 mr-1" />
                <span>{formatDateTime(date)}</span>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
