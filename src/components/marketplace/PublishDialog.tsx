'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Clipping } from '@/types/clipping'

type Props = {
  clipping: Clipping
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublished: () => void
}

export function PublishDialog({
  clipping,
  open,
  onOpenChange,
  onPublished,
}: Props) {
  const [isPublishing, setIsPublishing] = useState(false)

  const missingDescription = !clipping.description?.trim()

  const handlePublish = async () => {
    setIsPublishing(true)

    try {
      const res = await fetch('/api/marketplace/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clippingId: clipping.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao publicar no marketplace')
      }

      toast.success('Clipping publicado no marketplace!')
      onOpenChange(false)
      onPublished()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao publicar no marketplace',
      )
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar no Marketplace</DialogTitle>
          <DialogDescription>
            Publicar <strong>{clipping.name}</strong> no marketplace?
          </DialogDescription>
        </DialogHeader>

        {missingDescription && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Adicione uma descrição ao clipping antes de publicar.{' '}
              <Link
                href={`/minha-conta/clipping/${clipping.id}/editar`}
                className="underline font-medium"
              >
                Editar clipping
              </Link>
            </p>
          </div>
        )}

        {!missingDescription && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Descrição</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {clipping.description}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Recortes</p>
              {clipping.recortes.map((recorte, index) => (
                <div
                  key={recorte.id}
                  className="border rounded-md p-3 space-y-2"
                >
                  <p className="text-sm font-medium">
                    {recorte.title || `Recorte ${index + 1}`}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {recorte.themes.map((theme) => (
                      <Badge
                        key={theme}
                        variant="secondary"
                        className="text-xs"
                      >
                        {theme}
                      </Badge>
                    ))}
                    {recorte.agencies.map((agency) => (
                      <Badge key={agency} variant="outline" className="text-xs">
                        {agency}
                      </Badge>
                    ))}
                    {recorte.keywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        className="text-xs bg-muted text-muted-foreground"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={missingDescription || isPublishing}
            className="cursor-pointer"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              'Publicar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
