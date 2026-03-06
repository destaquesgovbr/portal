'use client'

import { Bell, BellOff, Loader2, X } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AgencyMultiSelect } from '@/components/filters/AgencyMultiSelect'
import { ThemeMultiSelect } from '@/components/filters/ThemeMultiSelect'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { urlBase64ToUint8Array } from '@/lib/push-utils'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const PUSH_WORKER_URL = process.env.NEXT_PUBLIC_PUSH_WORKER_URL || ''

const LS_KEY = 'push-notification-filters'

type FilterState = {
  themes: string[]
  agencies: string[]
  keywords: string[]
}

type ThemeNode = {
  code: string
  label: string
  children?: ThemeNode[]
}

type AgencyOption = {
  key: string
  name: string
  type: string
}

function loadFilters(): FilterState {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        themes: parsed.themes || [],
        agencies: parsed.agencies || [],
        keywords: parsed.keywords || [],
      }
    }
  } catch { }
  return { themes: [], agencies: [], keywords: [] }
}

function saveFilters(filters: FilterState) {
  localStorage.setItem(LS_KEY, JSON.stringify(filters))
}

/**
 * Detecta o nível do tema pelo número de dots no code:
 * "01" → theme_l1, "01.02" → theme_l2, "01.02.03" → theme_l3
 */
function themeCodeToFilterType(code: string): string {
  const dots = (code.match(/\./g) || []).length
  if (dots === 0) return 'theme_l1'
  if (dots === 1) return 'theme_l2'
  return 'theme_l3'
}

function buildFiltersPayload(state: FilterState) {
  return [
    ...state.themes.map((code) => ({
      type: themeCodeToFilterType(code),
      value: code,
    })),
    ...state.agencies.map((key) => ({ type: 'agency', value: key })),
    ...state.keywords.map((kw) => ({ type: 'keyword', value: kw })),
  ]
}

function hasAnyFilter(state: FilterState) {
  return (
    state.themes.length > 0 ||
    state.agencies.length > 0 ||
    state.keywords.length > 0
  )
}

export default function PushSubscriber() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)
  const processingRef = useRef(false)
  const syncedRef = useRef(false)

  // Filter state
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')

  // Data for selectors (fetched from API)
  const [themeHierarchy, setThemeHierarchy] = useState<ThemeNode[]>([])
  const [agencies, setAgencies] = useState<AgencyOption[]>([])
  const dataLoaded = useRef(false)

  // Check if push is supported and if already subscribed
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }

    const filters = loadFilters()
    setSelectedThemes(filters.themes)
    setSelectedAgencies(filters.agencies)
    setKeywords(filters.keywords)

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

  // Load preferences from Firestore when session is available.
  // Always apply Firestore values (even empty arrays) to override stale localStorage.
  useEffect(() => {
    if (!session?.user?.id) return

    fetch('/api/push/preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((prefs) => {
        if (!prefs) return
        setSelectedThemes(prefs.themes ?? [])
        setSelectedAgencies(prefs.agencies ?? [])
        setKeywords(prefs.keywords ?? [])
      })
      .catch((err) => console.error('Failed to load preferences:', err))
  }, [session?.user?.id])

  // Fetch filter data when sheet opens
  useEffect(() => {
    if (!open || dataLoaded.current) return

    fetch('/api/push/filters-data')
      .then((res) => res.json())
      .then((data) => {
        if (data.themes) setThemeHierarchy(data.themes)
        if (data.agencies) setAgencies(data.agencies)
        dataLoaded.current = true
      })
      .catch((err) => {
        console.error('Failed to load push filter data:', err)
      })
  }, [open])

  const addKeyword = useCallback(() => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed])
    }
    setKeywordInput('')
  }, [keywordInput, keywords])

  const removeKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }, [])

  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        addKeyword()
      }
    },
    [addKeyword],
  )

  const currentFilterState = useMemo<FilterState>(
    () => ({ themes: selectedThemes, agencies: selectedAgencies, keywords }),
    [selectedThemes, selectedAgencies, keywords],
  )

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
      const filters = buildFiltersPayload(currentFilterState)
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

      saveFilters(currentFilterState)
      setSubscribed(true)
      setOpen(false)
      toast.success('Notificações ativadas!')

      // Save preferences to Firestore if authenticated
      if (userId) {
        fetch('/api/push/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentFilterState),
        }).catch((err) => console.error('Failed to save preferences:', err))
      }
    } catch (err) {
      console.error('Push subscribe error:', err)
      toast.error('Erro ao ativar notificações.')
    } finally {
      setLoading(false)
      processingRef.current = false
    }
  }, [currentFilterState, session?.user?.id])

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
      setSelectedThemes([])
      setSelectedAgencies([])
      setKeywords([])
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

  // Build themes list for ThemeMultiSelect (needs {key, name} format)
  const themesFlat = useMemo(
    () => flattenThemeNodes(themeHierarchy),
    [themeHierarchy],
  )

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
            Configure seus filtros para receber notificações quando novas
            notícias forem publicadas.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="themes">
            <TabsList className="w-full">
              <TabsTrigger value="themes" className="flex-1">
                Temas
                {selectedThemes.length > 0 && (
                  <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                    {selectedThemes.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="agencies" className="flex-1">
                Órgãos
                {selectedAgencies.length > 0 && (
                  <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                    {selectedAgencies.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="keywords" className="flex-1">
                Palavras
                {keywords.length > 0 && (
                  <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                    {keywords.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="themes" className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Selecione temas de interesse (qualquer nível).
              </p>
              <ThemeMultiSelect
                themes={themesFlat}
                selectedThemes={selectedThemes}
                onSelectedThemesChange={setSelectedThemes}
                themeHierarchy={themeHierarchy}
              />
            </TabsContent>

            <TabsContent value="agencies" className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Selecione órgãos do governo para acompanhar.
              </p>
              <AgencyMultiSelect
                agencies={agencies}
                selectedAgencies={selectedAgencies}
                onSelectedAgenciesChange={setSelectedAgencies}
              />
            </TabsContent>

            <TabsContent value="keywords" className="mt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Adicione palavras-chave para receber notificações quando
                aparecerem em títulos de notícias.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  placeholder="Digite e pressione Enter..."
                  className="flex-1 px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addKeyword}
                  disabled={!keywordInput.trim()}
                  className="cursor-pointer"
                >
                  Adicionar
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full text-sm"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-destructive transition-colors"
                        aria-label={`Remover ${kw}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {subscribed ? (
            <>
              <Button
                onClick={handleSubscribe}
                disabled={loading || !hasAnyFilter(currentFilterState)}
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
              disabled={loading || !hasAnyFilter(currentFilterState)}
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

          {!hasAnyFilter(currentFilterState) && (
            <p className="text-xs text-muted-foreground text-center">
              Selecione ao menos um filtro para ativar.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Flatten theme hierarchy into {key, name} array for ThemeMultiSelect */
function flattenThemeNodes(
  nodes: ThemeNode[],
): { key: string; name: string }[] {
  const result: { key: string; name: string }[] = []
  for (const node of nodes) {
    result.push({ key: node.code, name: node.label })
    if (node.children) {
      result.push(...flattenThemeNodes(node.children))
    }
  }
  return result
}
