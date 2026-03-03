import Image from 'next/image'

interface WidgetHeaderProps {
  showLogo: boolean
}

export function WidgetHeader({ showLogo }: WidgetHeaderProps) {
  if (!showLogo) return null

  return (
    <div className="widget-header px-4 py-3 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8">
          <Image
            src="/logo-dgb.svg"
            alt="DGB - Destaques Gov.br"
            fill
            className="object-contain"
          />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-primary">
            Destaques Gov.br
          </h2>
          <p className="text-xs text-muted-foreground">
            Notícias do Governo Federal
          </p>
        </div>
      </div>
    </div>
  )
}
