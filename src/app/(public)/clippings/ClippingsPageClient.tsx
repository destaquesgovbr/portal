'use client'

import { differenceInDays, parseISO } from 'date-fns'
import { Info, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MarketplaceCard } from '@/components/marketplace/MarketplaceCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MarketplaceListing } from '@/types/clipping'
import type { ThemeChip } from './page'

type SortOption = 'recent' | 'popular' | 'trending'

type Props = {
  listings: MarketplaceListing[]
  themeChips: ThemeChip[]
  followedIds: string[]
  likedIds: string[]
}

function popularityScore(l: MarketplaceListing): number {
  return (l.likeCount ?? 0) + (l.followerCount ?? 0) * 2
}

function trendingScore(l: MarketplaceListing): number {
  const pop = popularityScore(l)
  const days = l.publishedAt
    ? differenceInDays(new Date(), parseISO(l.publishedAt))
    : 999
  const recencyBoost = 1 + Math.max(0, 30 - days) / 30
  return pop * recencyBoost
}

export function ClippingsPageClient({
  listings,
  themeChips,
  followedIds,
  likedIds,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const followedSet = new Set(followedIds)
  const likedSet = new Set(likedIds)

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('busca') ?? '',
  )
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'recent',
  )
  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    searchParams.getAll('tema'),
  )
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(
    searchParams.get('freq'),
  )

  const updateUrl = useCallback(
    (params: Record<string, string | string[] | null>) => {
      const url = new URLSearchParams()
      const q = params.busca !== undefined ? params.busca : searchQuery
      const s = params.sort !== undefined ? params.sort : sortBy
      const t = params.tema !== undefined ? params.tema : selectedThemes
      const f = params.freq !== undefined ? params.freq : selectedFrequency

      if (q && typeof q === 'string') url.set('busca', q)
      if (s && s !== 'recent' && typeof s === 'string') url.set('sort', s)
      if (Array.isArray(t)) {
        for (const theme of t) url.append('tema', theme)
      }
      if (f && typeof f === 'string') url.set('freq', f)

      const qs = url.toString()
      router.replace(qs ? `/clippings?${qs}` : '/clippings', {
        scroll: false,
      })
    },
    [router, searchQuery, sortBy, selectedThemes, selectedFrequency],
  )

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(
        () => updateUrl({ busca: value || null }),
        300,
      )
    },
    [updateUrl],
  )
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    },
    [],
  )

  const handleSort = useCallback(
    (value: string) => {
      setSortBy(value as SortOption)
      updateUrl({ sort: value === 'recent' ? null : value })
    },
    [updateUrl],
  )

  const toggleTheme = useCallback(
    (code: string) => {
      const next = selectedThemes.includes(code)
        ? selectedThemes.filter((t) => t !== code)
        : [...selectedThemes, code]
      setSelectedThemes(next)
      updateUrl({ tema: next.length > 0 ? next : null })
    },
    [selectedThemes, updateUrl],
  )

  const toggleFrequency = useCallback(
    (freq: string) => {
      const next = selectedFrequency === freq ? null : freq
      setSelectedFrequency(next)
      updateUrl({ freq: next })
    },
    [selectedFrequency, updateUrl],
  )

  const filtered = useMemo(() => {
    let result = [...listings]

    // Text search (case-insensitive, accent-insensitive)
    if (searchQuery) {
      const normalize = (s: string) =>
        s
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
      const q = normalize(searchQuery)
      result = result.filter(
        (l) =>
          normalize(l.name).includes(q) ||
          normalize(l.shortDescription ?? l.description ?? '').includes(q),
      )
    }

    // Theme filter
    if (selectedThemes.length > 0) {
      result = result.filter((l) =>
        l.recortes.some((r) =>
          r.themes.some((t) => selectedThemes.includes(t)),
        ),
      )
    }

    // Frequency filter
    if (selectedFrequency === 'daily') {
      result = result.filter((l) => l.schedule?.match(/\* \* \*$/))
    } else if (selectedFrequency === 'weekdays') {
      result = result.filter((l) => l.schedule?.match(/\* \* 1-5$/))
    }

    // Sort
    if (sortBy === 'popular') {
      result.sort((a, b) => popularityScore(b) - popularityScore(a))
    } else if (sortBy === 'trending') {
      result.sort((a, b) => trendingScore(b) - trendingScore(a))
    }
    // 'recent' is already the default order from server

    return result
  }, [listings, searchQuery, selectedThemes, selectedFrequency, sortBy])

  const hasActiveFilters =
    searchQuery || selectedThemes.length > 0 || selectedFrequency

  return (
    <>
      {/* Search + Sort row */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => handleSort(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="recent">Mais recentes</option>
          <option value="popular">Mais populares</option>
          <option value="trending">Em destaque</option>
        </select>
      </div>

      {/* Chips row */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Frequency chips */}
        <Button
          type="button"
          variant={selectedFrequency === 'daily' ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleFrequency('daily')}
          className="rounded-full"
        >
          Diários
        </Button>
        <Button
          type="button"
          variant={selectedFrequency === 'weekdays' ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleFrequency('weekdays')}
          className="rounded-full"
        >
          Dias úteis
        </Button>

        {/* Theme chips */}
        {themeChips.map((tc) => (
          <Button
            key={tc.code}
            type="button"
            variant={selectedThemes.includes(tc.code) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleTheme(tc.code)}
            className="rounded-full"
          >
            {tc.label} ({tc.count})
          </Button>
        ))}
      </div>

      {/* Transparency link */}
      <div className="mb-6">
        <Link
          href="/transparencia-algoritmica#prateleira-de-clippings"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit"
        >
          <Info className="h-3 w-3" />
          Como funciona a ordenação e filtragem
        </Link>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {hasActiveFilters
            ? 'Nenhum clipping encontrado com esses filtros'
            : 'Nenhum clipping publicado ainda'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <MarketplaceCard
              key={listing.id}
              listing={listing}
              isFollowing={followedSet.has(listing.id)}
              isLiked={likedSet.has(listing.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}
