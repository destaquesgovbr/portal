import { promises as fs } from 'node:fs'
import path from 'node:path'
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer'

export const metadata = {
  title: 'Transparência Algorítmica — DestaquesGovBr',
  description:
    'Como o DestaquesGovBr organiza, prioriza e apresenta conteúdo. Documentação dos algoritmos utilizados na plataforma.',
}

export default async function TransparenciaAlgoritmicaPage() {
  const filePath = path.join(
    process.cwd(),
    'content',
    'transparencia-algoritmica.md',
  )
  const content = await fs.readFile(filePath, 'utf-8')

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <MarkdownRenderer content={content} />
    </div>
  )
}
