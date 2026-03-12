import { notFound } from 'next/navigation'
import ClientArticle from '@/components/articles/ClientArticle'
import { getArticleById } from './actions'

interface Props {
  params: Promise<{ articleId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { articleId } = await params
  const articleResult = await getArticleById(articleId)

  if (articleResult.type !== 'ok') {
    return {
      title: 'Notícia não encontrada — DestaquesGovBr',
      description: 'Esta notícia não está disponível no momento.',
    }
  }

  const article = articleResult.data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!
  const pageUrl = `${siteUrl}/artigos/${article.unique_id}`

  const title = article.title || 'Notícia — DestaquesGovBr'
  const description =
    'Acompanhe as ações, programas e políticas públicas do Governo Federal do Brasil.'
  const image = article.image ? article.image : `${siteUrl}/fallback.png`

  return {
    title: `${title} — DestaquesGovBr`,
    description,
    openGraph: {
      title: `${title} — DestaquesGovBr`,
      description,
      url: pageUrl,
      type: 'article',
      locale: 'pt_BR',
      siteName: 'DestaquesGovBr',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: article.title || 'Notícia do Governo Federal',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — DestaquesGovBr`,
      description,
      images: [image],
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { articleId } = await params
  const articleResult = await getArticleById(articleId)

  if (articleResult.type === 'err') {
    if (articleResult.error === 'not_found') notFound()
    if (articleResult.error === 'db_error')
      return <div>Erro no banco de dados.</div>
  }

  if (articleResult.type !== 'ok') {
    return <div>Erro desconhecido ao carregar a notícia.</div>
  }

  const article = articleResult.data
  const articleUrl = new URL(article.url || '', 'https://www.gov.br')
  const baseUrl = articleUrl.hostname.replace('www.', '')
  const pageUrl = `${process.env.NEXT_PUBLIC_SITE_URL!}/artigos/${article.unique_id}`

  return <ClientArticle article={article} baseUrl={baseUrl} pageUrl={pageUrl} />
}
