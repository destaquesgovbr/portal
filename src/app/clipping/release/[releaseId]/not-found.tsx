import Link from 'next/link'

export default function ReleaseNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-800">
          Release não encontrada
        </h1>
        <p className="text-gray-500">
          Esta edição do clipping não existe ou foi removida.
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-primary hover:underline"
        >
          Voltar ao portal
        </Link>
      </div>
    </div>
  )
}
