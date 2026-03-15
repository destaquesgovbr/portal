'use client'

import Link from 'next/link'
import type { DeliveryChannels } from '@/types/clipping'
import { ExtraEmailsInput } from './ExtraEmailsInput'

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
  const toggle = (channel: keyof DeliveryChannels) => {
    onChange({ ...value, [channel]: !value[channel] })
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
    </div>
  )
}
