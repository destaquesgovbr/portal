'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useCallback, useState } from 'react'
import { urlBase64ToUint8Array } from '@/lib/push-utils'
import type { DeliveryChannels } from '@/types/clipping'
import { ExtraEmailsInput } from './ExtraEmailsInput'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const PUSH_WORKER_URL = process.env.NEXT_PUBLIC_PUSH_WORKER_URL || ''

type Props = {
  value: DeliveryChannels
  onChange: (v: DeliveryChannels) => void
  hasTelegram: boolean
  extraEmails: string[]
  onExtraEmailsChange: (emails: string[]) => void
}

export function ChannelSelector({
  value,
  onChange,
  hasTelegram,
  extraEmails,
  onExtraEmailsChange,
}: Props) {
  const { data: session } = useSession()
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  const toggle = (channel: keyof DeliveryChannels) => {
    if (channel === 'push') return // handled by handlePushToggle
    onChange({ ...value, [channel]: !value[channel] })
  }

  const handlePushToggle = useCallback(async () => {
    // If already enabled, just disable
    if (value.push) {
      onChange({ ...value, push: false })
      return
    }

    // Check browser support
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushError('Seu navegador não suporta notificações push.')
      return
    }

    if (!VAPID_PUBLIC_KEY || !PUSH_WORKER_URL) {
      setPushError('Notificações push não estão configuradas no servidor.')
      return
    }

    setPushLoading(true)
    setPushError(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushError(
          'Permissão de notificação negada. Ative nas configurações do navegador.',
        )
        setPushLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const sub = subscription.toJSON()
      const userId = session?.user?.id ?? null

      const response = await fetch(`${PUSH_WORKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
          filters: {},
          user_id: userId,
        }),
      })

      if (!response.ok) {
        throw new Error('Falha ao registrar notificação push')
      }

      onChange({ ...value, push: true })
    } catch (err) {
      setPushError(
        err instanceof Error ? err.message : 'Erro ao ativar notificações',
      )
    } finally {
      setPushLoading(false)
    }
  }, [value, onChange, session])

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
            <Link
              href="/api/auth/telegram?state=pending"
              className="text-primary underline hover:no-underline"
            >
              conectar Telegram
            </Link>
          </p>
        )}
      </div>

      {/* Push */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value.push}
            onChange={handlePushToggle}
            disabled={pushLoading}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
            aria-label="Push"
          />
          <div className="flex items-center gap-2">
            <div>
              <span className="text-sm font-medium">Push</span>
              <p className="text-xs text-muted-foreground">
                Receba notificação push no navegador
              </p>
            </div>
            {pushLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </label>
        {pushError && (
          <p className="text-xs text-destructive pl-7">{pushError}</p>
        )}
      </div>
    </div>
  )
}
