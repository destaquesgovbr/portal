import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

/**
 * Conversor server-side de markdown para HTML.
 *
 * Usa os mesmos plugins do MarkdownRenderer.tsx (remark-gfm + rehype-raw)
 * para garantir paridade na interpretação do markdown.
 * A diferença é que este módulo gera HTML string (para feeds RSS/Atom/JSON),
 * enquanto o MarkdownRenderer gera React elements com estilos Tailwind.
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify)

const MAX_CONTENT_LENGTH = 50_000

export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown) return ''

  const input =
    markdown.length > MAX_CONTENT_LENGTH
      ? `${markdown.substring(0, MAX_CONTENT_LENGTH)}\n\n[...]`
      : markdown

  const result = await processor.process(input)
  return String(result)
}
