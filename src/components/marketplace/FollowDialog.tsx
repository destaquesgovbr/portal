'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ChannelSelector } from '@/components/clipping/ChannelSelector'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DeliveryChannels } from '@/types/clipping'

type Props = {
  listingId: string
  listingName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFollowed: () => void
  hasTelegram: boolean
  initialChannels?: DeliveryChannels
  initialExtraEmails?: string[]
  initialWebhookUrl?: string
  isEditing?: boolean
}

export function FollowDialog({
  listingId,
  listingName,
  open,
  onOpenChange,
  onFollowed,
  hasTelegram,
  initialChannels,
  initialExtraEmails,
  initialWebhookUrl,
  isEditing = false,
}: Props) {
  const [channels, setChannels] = useState<DeliveryChannels>(
    initialChannels ?? {
      email: true,
      telegram: false,
      push: false,
      webhook: false,
    },
  )
  const [extraEmails, setExtraEmails] = useState<string[]>(
    initialExtraEmails ?? [],
  )
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasChannel =
    channels.email || channels.telegram || channels.push || channels.webhook
  const webhookMissingUrl = channels.webhook && !webhookUrl

  const handleSubmit = async () => {
    if (!hasChannel || webhookMissingUrl) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/clippings/public/${listingId}/follow`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryChannels: channels,
          extraEmails,
          webhookUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao seguir listing')
      }

      toast.success(
        isEditing
          ? 'Configurações de entrega atualizadas!'
          : 'Agora voce esta seguindo este clipping!',
      )
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
          <DialogTitle>
            {isEditing ? 'Editar entrega' : `Seguir ${listingName}`}
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja receber este clipping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <ChannelSelector
            value={channels}
            onChange={setChannels}
            hasTelegram={hasTelegram}
            extraEmails={extraEmails}
            onExtraEmailsChange={setExtraEmails}
            webhookUrl={webhookUrl}
            onWebhookUrlChange={setWebhookUrl}
          />

          {!hasChannel && (
            <p className="text-xs text-destructive">
              Selecione ao menos um canal de entrega
            </p>
          )}
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
            onClick={handleSubmit}
            disabled={!hasChannel || webhookMissingUrl || isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? 'Salvando...' : 'Seguindo...'}
              </>
            ) : isEditing ? (
              'Salvar'
            ) : (
              'Seguir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
