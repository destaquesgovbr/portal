'use client'

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const PUSH_WORKER_URL = process.env.NEXT_PUBLIC_PUSH_WORKER_URL || ''

const THEME_L1_OPTIONS = [
  'Economia e Finanças',
  'Educação',
  'Saúde',
  'Segurança Pública',
  'Meio Ambiente e Sustentabilidade',
  'Ciência, Tecnologia e Inovação',
  'Infraestrutura e Transportes',
  'Cultura, Artes e Patrimônio',
  'Esportes e Lazer',
  'Agricultura, Pecuária e Abastecimento',
  'Indústria e Comércio',
  'Relações Internacionais e Diplomacia',
  'Justiça e Direitos Humanos',
  'Trabalho e Emprego',
  'Desenvolvimento Social',
  'Turismo',
  'Energia e Recursos Minerais',
  'Comunicações e Mídia',
  'Defesa e Forças Armadas',
  'Políticas Públicas e Governança',
  'Legislação e Regulamentação',
  'Eventos Oficiais e Cerimônias',
  'Estatísticas e Dados Públicos',
  'Minorias e Grupos Especiais',
  'Habitação e Urbanismo',
]

const LS_KEY = 'push-notification-filters'

type FilterState = {
  themes: string[]
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function loadFilters(): FilterState {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { themes: [] }
}

function saveFilters(filters: FilterState) {
  localStorage.setItem(LS_KEY, JSON.stringify(filters))
}

export default function PushSubscriber() {
  const [open, setOpen] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [supported, setSupported] = useState(true)

  // Check if push is supported and if already subscribed
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }

    const filters = loadFilters()
    setSelectedThemes(filters.themes)

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
      })
    })
  }, [])

  const toggleTheme = useCallback((theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme)
        ? prev.filter((t) => t !== theme)
        : [...prev, theme],
    )
  }, [])

  const handleSubscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY || !PUSH_WORKER_URL) {
      toast.error('Notificações push não estão configuradas.')
      return
    }

    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Permissão de notificação negada.')
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const sub = subscription.toJSON()
      const filters = selectedThemes.map((theme) => ({
        type: 'theme_l1',
        value: theme,
      }))

      const response = await fetch(`${PUSH_WORKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
          filters,
        }),
      })

      if (!response.ok) throw new Error('Falha ao registrar')

      saveFilters({ themes: selectedThemes })
      setSubscribed(true)
      setOpen(false)
      toast.success('Notificações ativadas!')
    } catch (err) {
      console.error('Push subscribe error:', err)
      toast.error('Erro ao ativar notificações.')
    } finally {
      setLoading(false)
    }
  }, [selectedThemes])

  const handleUnsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch(`${PUSH_WORKER_URL}/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }

      localStorage.removeItem(LS_KEY)
      setSubscribed(false)
      setSelectedThemes([])
      setOpen(false)
      toast.success('Notificações desativadas.')
    } catch (err) {
      console.error('Push unsubscribe error:', err)
      toast.error('Erro ao desativar notificações.')
    } finally {
      setLoading(false)
    }
  }, [])

  if (!supported || !VAPID_PUBLIC_KEY) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          title={
            subscribed ? 'Gerenciar notificações' : 'Ativar notificações'
          }
        >
          {subscribed ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Notificações Push</SheetTitle>
          <SheetDescription>
            Selecione os temas para receber notificações quando novas notícias
            forem publicadas.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {THEME_L1_OPTIONS.map((theme) => (
            <label
              key={theme}
              className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedThemes.includes(theme)}
                onChange={() => toggleTheme(theme)}
                className="h-4 w-4 rounded border-gray-300 accent-primary"
              />
              <span className="text-sm">{theme}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {subscribed ? (
            <>
              <Button
                onClick={handleSubscribe}
                disabled={loading || selectedThemes.length === 0}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Atualizar Filtros
              </Button>
              <Button
                variant="outline"
                onClick={handleUnsubscribe}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2" />
                )}
                Desativar Notificações
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={loading || selectedThemes.length === 0}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Ativar Notificações
            </Button>
          )}

          {selectedThemes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Selecione ao menos um tema para ativar.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
