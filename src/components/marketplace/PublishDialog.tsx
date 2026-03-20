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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  const [description, setDescription] = useState('')
  const [recorteTitles, setRecorteTitles] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(clipping.recortes.map((r) => [r.id, r.title ?? ''])),
  )
  const [isPublishing, setIsPublishing] = useState(false)

  const isValid =
    description.trim().length > 0 &&
    description.length <= 500 &&
    clipping.recortes.every((r) => {
      const title = recorteTitles[r.id] ?? ''
      return title.trim().length > 0 && title.length <= 100
    })

  const handleRecorteTitleChange = (id: string, value: string) => {
    setRecorteTitles((prev) => ({ ...prev, [id]: value }))
  }

  const handlePublish = async () => {
    if (!isValid) return
    setIsPublishing(true)

    try {
      const res = await fetch('/api/marketplace/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clippingId: clipping.id,
          description,
          recortes: clipping.recortes.map((r) => ({
            id: r.id,
            title: recorteTitles[r.id]?.trim() ?? '',
            themes: r.themes,
            agencies: r.agencies,
            keywords: r.keywords,
          })),
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
            Publicar <strong>{clipping.name}</strong> para que outros usuários
            possam seguir este clipping.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="publish-description">Descrição</Label>
            <Textarea
              id="publish-description"
              placeholder="Descreva o clipping para outros usuários..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={isPublishing}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {clipping.recortes.map((recorte, index) => (
            <div key={recorte.id} className="space-y-2 border rounded-md p-3">
              <Label htmlFor={`recorte-title-${recorte.id}`}>
                Título do Recorte {index + 1}
              </Label>
              <Input
                id={`recorte-title-${recorte.id}`}
                placeholder="Título do recorte"
                value={recorteTitles[recorte.id] ?? ''}
                onChange={(e) =>
                  handleRecorteTitleChange(recorte.id, e.target.value)
                }
                maxLength={100}
                disabled={isPublishing}
              />
              <p className="text-xs text-muted-foreground text-right">
                {(recorteTitles[recorte.id] ?? '').length}/100
              </p>

              <div className="flex flex-wrap gap-1">
                {recorte.themes.map((theme) => (
                  <Badge key={theme} variant="secondary" className="text-xs">
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
            disabled={!isValid || isPublishing}
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
