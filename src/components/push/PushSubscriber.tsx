'use client'

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AgencyGroupedSelect } from '@/components/push/AgencyGroupedSelect'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { urlBase64ToUint8Array } from '@/lib/push-utils'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const PUSH_WORKER_URL = process.env.NEXT_PUBLIC_PUSH_WORKER_URL || ''

const LS_KEY = 'push-notification-filters'

type AgencyOption = {
  key: string
  name: string
  type: string
}

function loadAgencies(): string[] {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.agencies || []
    }
  } catch {}
  return []
}

function saveAgencies(agencies: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify({ agencies }))
}

function buildFiltersPayload(agencies: string[]) {
  return agencies.map((key) => ({ type: 'agency', value: key }))
}

export default function PushSubscriber() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)
  const processingRef = useRef(false)
  const syncedRef = useRef(false)

  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([])
  const [agencies, setAgencies] = useState<AgencyOption[]>([])
  const dataLoaded = useRef(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }

    setSelectedAgencies(loadAgencies())

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
      })
    })
  }, [])

  // Sync subscription with user_id when session becomes available
  useEffect(() => {
    if (!session?.user?.id || syncedRef.current || !subscribed) return
    syncedRef.current = true

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!sub) return
        const subJson = sub.toJSON()
        fetch('/api/push/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          }),
        }).catch((err) => console.error('Push sync error:', err))
      })
  }, [session?.user?.id, subscribed])

  // Load preferences from Firestore when session is available
  useEffect(() => {
    if (!session?.user?.id) return

    fetch('/api/push/preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((prefs) => {
        if (!prefs) return
        setSelectedAgencies(prefs.agencies ?? [])
      })
      .catch((err) => console.error('Failed to load preferences:', err))
  }, [session?.user?.id])

  // Fetch agencies data when sheet opens
  useEffect(() => {
    if (!open || dataLoaded.current) return

    fetch('/api/push/filters-data')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (data.agencies) setAgencies(data.agencies)
        dataLoaded.current = true
      })
      .catch((err) => {
        console.error('Failed to load push filter data:', err)
      })
  }, [open])

  const handleSubscribe = useCallback(async () => {
    if (processingRef.current) return
    if (!VAPID_PUBLIC_KEY || !PUSH_WORKER_URL) {
      toast.error('Notificações WebPush não estão configuradas.')
      return
    }

    processingRef.current = true
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Permissão de notificação negada.')
        setLoading(false)
        processingRef.current = false
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const sub = subscription.toJSON()
      const filters = buildFiltersPayload(selectedAgencies)
      const userId = session?.user?.id ?? null

      const response = await fetch(`${PUSH_WORKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
          filters,
          user_id: userId,
        }),
      })

      if (!response.ok) throw new Error('Falha ao registrar')

      saveAgencies(selectedAgencies)
      setSubscribed(true)
      setOpen(false)
      toast.success('Notificações ativadas!')

      if (userId) {
        fetch('/api/push/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agencies: selectedAgencies }),
        }).catch((err) => console.error('Failed to save preferences:', err))
      }
    } catch (err) {
      console.error('Push subscribe error:', err)
      toast.error('Erro ao ativar notificações.')
    } finally {
      setLoading(false)
      processingRef.current = false
    }
  }, [selectedAgencies, session?.user?.id])

  const handleUnsubscribe = useCallback(async () => {
    if (processingRef.current) return

    processingRef.current = true
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        if (PUSH_WORKER_URL) {
          const response = await fetch(`${PUSH_WORKER_URL}/unsubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          })
          if (!response.ok) {
            console.warn(
              'Server unsubscribe failed — removing local subscription anyway',
            )
          }
        }
        await subscription.unsubscribe()
      }

      localStorage.removeItem(LS_KEY)
      setSubscribed(false)
      setSelectedAgencies([])
      syncedRef.current = false
      setOpen(false)
      toast.success('Notificações desativadas.')
    } catch (err) {
      console.error('Push unsubscribe error:', err)
      toast.error('Erro ao desativar notificações.')
    } finally {
      setLoading(false)
      processingRef.current = false
    }
  }, [])

  if (!supported || !VAPID_PUBLIC_KEY) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 cursor-pointer"
          aria-pressed={subscribed}
          aria-label={
            subscribed
              ? 'Gerenciar notificações (ativas)'
              : 'Ativar notificações'
          }
        >
          {subscribed ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[360px] sm:w-[420px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Notificações WebPush</SheetTitle>
          <SheetDescription>
            Selecione os órgãos que você quer acompanhar para receber
            notificações quando publicarem novas notícias.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <AgencyGroupedSelect
            agencies={agencies}
            selectedAgencies={selectedAgencies}
            onSelectedAgenciesChange={setSelectedAgencies}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {subscribed ? (
            <>
              <Button
                onClick={handleSubscribe}
                disabled={loading || selectedAgencies.length === 0}
                className="cursor-pointer"
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
                className="cursor-pointer"
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
              disabled={loading || selectedAgencies.length === 0}
              className="cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Ativar Notificações
            </Button>
          )}

          {selectedAgencies.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Selecione ao menos um órgão para ativar.
            </p>
          )}

          {!session ? (
            <div className="mt-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Para recursos avançados como Clipping,{' '}
              <a
                href="/api/auth/signin"
                className="text-primary underline hover:no-underline"
              >
                faça login
              </a>
            </div>
          ) : (
            <div className="mt-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Gerencie seus{' '}
              <a
                href="/minha-conta/clipping"
                className="text-primary underline hover:no-underline"
              >
                Clippings →
              </a>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
