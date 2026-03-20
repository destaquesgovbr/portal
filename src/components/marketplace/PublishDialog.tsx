'use client'

import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import type { Clipping } from '@/types/clipping'

type Props = {
  clipping: Clipping
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublished: () => void
  themeMap?: Record<string, string>
  agencyMap?: Record<string, string>
}

export function PublishDialog({
  clipping,
  open,
  onOpenChange,
  onPublished,
  themeMap = {},
  agencyMap = {},
}: Props) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [description, setDescription] = useState(clipping.description ?? '')

  const missingDescription = !description.trim()

  const handlePublish = async () => {
    setIsPublishing(true)

    try {
      const res = await fetch('/api/clippings/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clippingId: clipping.id,
          description: description.trim(),
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

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              Descrição para o marketplace{' '}
              <span className="text-destructive">*</span>
            </p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Descreva o propósito do seu clipping para que outros usuários entendam o conteúdo..."
              rows={3}
              maxLength={500}
              disabled={isPublishing}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Recortes</p>
            {clipping.recortes.map((recorte, index) => (
              <div key={recorte.id} className="border rounded-md p-3 space-y-2">
                <p className="text-sm font-medium">
                  {recorte.title || `Recorte ${index + 1}`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {recorte.themes.map((theme) => (
                    <Badge key={theme} className="text-xs">
                      {themeMap[theme] ?? theme}
                    </Badge>
                  ))}
                  {recorte.agencies.map((agency) => (
                    <Badge
                      key={agency}
                      className="text-xs border-border bg-background"
                    >
                      {agencyMap[agency] ?? agency}
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
