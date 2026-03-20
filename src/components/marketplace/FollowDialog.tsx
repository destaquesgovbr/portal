'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ScheduleSelect } from '@/components/clipping/ScheduleSelect'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type Props = {
  listingId: string
  listingName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFollowed: () => void
}

export function FollowDialog({
  listingId,
  listingName,
  open,
  onOpenChange,
  onFollowed,
}: Props) {
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [channels, setChannels] = useState({
    email: true,
    telegram: false,
    push: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasChannel = channels.email || channels.telegram || channels.push

  const toggleChannel = (channel: keyof typeof channels) => {
    setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }))
  }

  const handleFollow = async () => {
    if (!hasChannel) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/clippings/public/${listingId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleTime,
          deliveryChannels: channels,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao seguir listing')
      }

      toast.success('Agora você está seguindo este clipping!')
      onOpenChange(false)
      onFollowed()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao seguir listing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seguir {listingName}</DialogTitle>
          <DialogDescription>
            Configure quando e como deseja receber este clipping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Horário de entrega</Label>
            <ScheduleSelect value={scheduleTime} onChange={setScheduleTime} />
          </div>

          <div className="space-y-3">
            <Label>Canais de entrega</Label>

            <div className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={channels.email}
                onCheckedChange={() => toggleChannel('email')}
                disabled={isSubmitting}
              />
              <div>
                <span className="text-sm font-medium">Email</span>
                <p className="text-xs text-muted-foreground">
                  Receba o resumo por e-mail
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={channels.telegram}
                onCheckedChange={() => toggleChannel('telegram')}
                disabled={isSubmitting}
              />
              <div>
                <span className="text-sm font-medium">Telegram</span>
                <p className="text-xs text-muted-foreground">
                  Receba o resumo via bot no Telegram
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={channels.push}
                onCheckedChange={() => toggleChannel('push')}
                disabled={isSubmitting}
              />
              <div>
                <span className="text-sm font-medium">Push</span>
                <p className="text-xs text-muted-foreground">
                  Receba notificação push no navegador
                </p>
              </div>
            </div>

            {!hasChannel && (
              <p className="text-xs text-destructive">
                Selecione ao menos um canal de entrega
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleFollow}
            disabled={!hasChannel || isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Seguindo...
              </>
            ) : (
              'Seguir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
