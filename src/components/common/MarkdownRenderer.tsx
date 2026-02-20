'use client'

import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { ImageCarousel } from '@/components/articles/ImageCarousel'
import { preprocessImageCarousels } from '@/lib/markdown-carousel'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * MarkdownRenderer
 * Componente centralizado para renderizar markdown com estilos Tailwind consistentes.
 * Usa ReactMarkdown + remark-gfm + rehype-raw.
 */
export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const processedContent = preprocessImageCarousels(content)

  // biome-ignore lint/suspicious/noExplicitAny: react-markdown Components type does not support custom HTML elements
  const components: Components & Record<string, React.ComponentType<any>> = {
    // Parágrafos
    p: ({ node, children, ...props }) => (
      <p className="my-4 leading-relaxed text-primary/90" {...props}>
        {children}
      </p>
    ),

    // Títulos
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold text-primary mt-6 mb-3">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold text-primary mt-6 mb-3 border-b border-border pb-1">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-primary mt-5 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-lg font-semibold text-primary mt-4 mb-2">
        {children}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="text-base font-semibold text-primary mt-4 mb-2">
        {children}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="text-sm font-semibold text-primary mt-3 mb-2 uppercase tracking-wide">
        {children}
      </h6>
    ),

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-[var(--accent)] underline underline-offset-2 hover:opacity-90 transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),

    // Listas não ordenadas
    ul: ({ children }) => (
      <ul className="list-disc ml-6 my-4 space-y-1 text-primary/90 text-left">
        {children}
      </ul>
    ),

    // Listas ordenadas
    ol: ({ children }) => (
      <ol className="list-decimal ml-6 my-4 space-y-1 text-primary/90">
        {children}
      </ol>
    ),

    // Itens de lista
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,

    // Imagens
    img: ({ src, alt }) => (
      <span className="block my-6 text-center">
        <img
          src={src ?? ''}
          alt={alt ?? ''}
          className="inline-block max-w-full rounded-md shadow-sm"
          loading="lazy"
        />
      </span>
    ),

    // Citações
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[var(--government-blue)] pl-4 italic text-primary/80 my-4">
        {children}
      </blockquote>
    ),

    // Código (inline ou bloco)
    code: ({ node, children, ...props }) => {
      const isInline = node?.position?.start?.line === node?.position?.end?.line

      if (isInline) {
        return (
          <code
            className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary/90"
            {...props}
          >
            {children}
          </code>
        )
      }

      return (
        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono my-4">
          <code>{children}</code>
        </pre>
      )
    },

    // Linhas horizontais
    hr: () => <hr className="my-8 border-t border-border" />,

    // Carrossel de imagens (gerado pelo preprocessamento)
    'image-carousel': (props: Record<string, string>) => {
      const imagesAttr = props['data-images'] ?? ''
      const altsAttr = props['data-alts'] ?? ''
      const images = imagesAttr ? imagesAttr.split('||') : []
      const alts = altsAttr ? altsAttr.split('||') : []
      return <ImageCarousel images={images} alts={alts} />
    },
  }

  return (
    <div className={cn('prose prose-lg max-w-none', className)}>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
