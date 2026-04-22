'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { DeliveryChannels } from '@/types/clipping'
import { ExtraEmailsInput } from './ExtraEmailsInput'

type Props = {
  value: DeliveryChannels
  onChange: (v: DeliveryChannels) => void
  hasTelegram: boolean
  extraEmails: string[]
  onExtraEmailsChange: (emails: string[]) => void
  webhookUrl: string
  onWebhookUrlChange: (url: string) => void
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

export function ChannelSelector({
  value,
  onChange,
  hasTelegram,
  extraEmails,
  onExtraEmailsChange,
  webhookUrl,
  onWebhookUrlChange,
}: Props) {
  const [linkLoading, setLinkLoading] = useState(false)
  const [webhookTouched, setWebhookTouched] = useState(false)
  const webhookUrlError =
    webhookTouched && value.webhook && webhookUrl === ''
      ? 'URL do webhook é obrigatória'
      : webhookTouched && webhookUrl !== '' && !isValidUrl(webhookUrl)
        ? 'URL inválida'
        : null

  const toggle = (channel: keyof DeliveryChannels) => {
    onChange({ ...value, [channel]: !value[channel] })
  }

  const handleConnectTelegram = async () => {
    setLinkLoading(true)
    try {
      const res = await fetch('/api/auth/telegram/initiate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Erro ao gerar link do Telegram')
        return
      }
      window.open(data.url, '_blank')
    } finally {
      setLinkLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selecione como deseja receber o clipping diário.
      </p>

      {/* Email */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.email}
          onChange={() => toggle('email')}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          aria-label="Email"
        />
        <div>
          <span className="text-sm font-medium">Email</span>
          <p className="text-xs text-muted-foreground">
            Receba o resumo por e-mail
          </p>
        </div>
      </label>

      {value.email && (
        <ExtraEmailsInput emails={extraEmails} onChange={onExtraEmailsChange} />
      )}

      {/* Telegram */}
      <div className="space-y-1.5">
        <label
          className={`flex items-center gap-3 ${!hasTelegram ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          <input
            type="checkbox"
            checked={value.telegram}
            onChange={() => hasTelegram && toggle('telegram')}
            disabled={!hasTelegram}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
            aria-label="Telegram"
          />
          <div>
            <span className="text-sm font-medium">Telegram</span>
            <p className="text-xs text-muted-foreground">
              Receba o resumo via bot no Telegram
            </p>
          </div>
        </label>
        {!hasTelegram && (
          <p className="text-xs text-muted-foreground pl-7">
            Vincule sua conta Telegram para ativar —{' '}
            <Button
              type="button"
              variant="link"
              onClick={handleConnectTelegram}
              disabled={linkLoading}
              className="h-auto p-0 text-xs"
            >
              {linkLoading ? 'Gerando link…' : 'conectar Telegram'}
            </Button>
          </p>
        )}
      </div>

      {/* Push */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.push}
          onChange={() => toggle('push')}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          aria-label="Push"
        />
        <div>
          <span className="text-sm font-medium">Push</span>
          <p className="text-xs text-muted-foreground">
            Receba notificação push no navegador
          </p>
        </div>
      </label>

      {/* Webhook */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.webhook}
          onChange={() => toggle('webhook')}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          aria-label="Webhook"
        />
        <div>
          <span className="text-sm font-medium">Webhook</span>
          <p className="text-xs text-muted-foreground">
            Receba o resumo via POST JSON em uma URL
          </p>
        </div>
      </label>

      {value.webhook && (
        <div className="pl-7 space-y-1">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => onWebhookUrlChange(e.target.value)}
            onBlur={() => setWebhookTouched(true)}
            placeholder="https://exemplo.com/webhook"
            aria-label="Webhook URL"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {webhookUrlError && (
            <p className="text-xs text-destructive">{webhookUrlError}</p>
          )}
        </div>
      )}
    </div>
  )
}
