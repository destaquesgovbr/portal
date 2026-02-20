import { AlertCircle } from 'lucide-react'

interface WidgetErrorProps {
  title?: string
  message: string
}

export function WidgetError({
  title = 'Erro ao carregar widget',
  message,
}: WidgetErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="text-center space-y-3 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2">{message}</p>
        </div>
      </div>
    </div>
  )
}
