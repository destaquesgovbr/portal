'use client'

import { Copy, Rss } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { AgencyMultiSelect } from '@/components/filters/AgencyMultiSelect'
import { ThemeMultiSelect } from '@/components/filters/ThemeMultiSelect'
import type { AgencyOption } from '@/data/agencies-utils'
import type { ThemeOption } from '@/data/themes-utils'

type Props = {
  agencies: AgencyOption[]
  themes: ThemeOption[]
  topThemes: { key: string; name: string }[]
}

export default function FeedsPageClient({
  agencies,
  themes,
  topThemes,
}: Props) {
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([])
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (selectedAgencies.length > 0)
      params.set('agencias', selectedAgencies.join(','))
    if (selectedThemes.length > 0) params.set('temas', selectedThemes.join(','))
    if (selectedTag.trim()) params.set('tag', selectedTag.trim())
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [selectedAgencies, selectedThemes, selectedTag, searchQuery])

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const feedUrls = {
    rss: `${siteUrl}/feed.xml${queryString}`,
    atom: `${siteUrl}/feed.atom${queryString}`,
    json: `${siteUrl}/feed.json${queryString}`,
  }

  const copyToClipboard = (url: string, label: string) => {
    navigator.clipboard.writeText(url)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleAgenciesChange = useCallback((agencies: string[]) => {
    setSelectedAgencies(agencies)
  }, [])

  const handleThemesChange = useCallback((themes: string[]) => {
    setSelectedThemes(themes)
  }, [])

  const agencyNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of agencies) map[a.key] = a.name
    return map
  }, [agencies])

  const themeNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of themes) map[t.key] = t.name
    return map
  }, [themes])

  const ministerios = agencies.filter((a) => a.type === 'Ministério')

  return (
    <div className="space-y-12">
      {/* Feed Builder */}
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-primary mb-6">
          Construtor de Feed
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-sm font-medium text-muted-foreground mb-1 block">
              Órgãos (opcional)
            </span>
            <AgencyMultiSelect
              agencies={agencies}
              selectedAgencies={selectedAgencies}
              onSelectedAgenciesChange={handleAgenciesChange}
            />
            {selectedAgencies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedAgencies.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
                  >
                    {agencyNameMap[key] ?? key}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAgencies((prev) =>
                          prev.filter((a) => a !== key),
                        )
                      }
                      className="hover:text-red-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="text-sm font-medium text-muted-foreground mb-1 block">
              Temas (opcional)
            </span>
            <ThemeMultiSelect
              themes={themes}
              selectedThemes={selectedThemes}
              onSelectedThemesChange={handleThemesChange}
            />
            {selectedThemes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedThemes.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded"
                  >
                    {themeNameMap[key] ?? key}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedThemes((prev) =>
                          prev.filter((t) => t !== key),
                        )
                      }
                      className="hover:text-red-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="feed-tag"
              className="text-sm font-medium text-muted-foreground mb-1 block"
            >
              Tag (opcional)
            </label>
            <input
              id="feed-tag"
              type="text"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              placeholder="Ex: diplomacia"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="feed-busca"
              className="text-sm font-medium text-muted-foreground mb-1 block"
            >
              Busca (opcional)
            </label>
            <input
              id="feed-busca"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Termo de busca"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Generated URLs */}
        <div className="space-y-3">
          {(
            [
              { label: 'RSS 2.0', url: feedUrls.rss },
              { label: 'Atom 1.0', url: feedUrls.atom },
              { label: 'JSON Feed', url: feedUrls.json },
            ] as const
          ).map(({ label, url }) => (
            <div
              key={label}
              className="flex items-center gap-3 bg-muted/50 rounded-md px-4 py-3"
            >
              <Rss className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-sm font-medium w-24">{label}</span>
              <code className="text-xs text-muted-foreground truncate flex-1">
                {url}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(url, label)}
                className="shrink-0 p-2 hover:bg-muted rounded transition-colors"
                title="Copiar URL"
              >
                {copied === label ? (
                  <span className="text-xs text-green-600">Copiado!</span>
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Feeds por Órgão */}
      <div>
        <h3 className="text-xl font-semibold text-primary mb-4">
          Feeds por Ministério
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ministerios.map((agency) => (
            <div
              key={agency.key}
              className="flex items-center gap-2 p-3 bg-white border rounded-md"
            >
              <Rss className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-sm flex-1 truncate">{agency.name}</span>
              <a
                href={`/feed.xml?agencias=${agency.key}`}
                className="text-xs text-muted-foreground hover:text-orange-600 transition-colors"
                title="RSS"
              >
                RSS
              </a>
              <a
                href={`/feed.atom?agencias=${agency.key}`}
                className="text-xs text-muted-foreground hover:text-orange-600 transition-colors"
                title="Atom"
              >
                Atom
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Feeds por Tema */}
      <div>
        <h3 className="text-xl font-semibold text-primary mb-4">
          Feeds por Tema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topThemes.map((theme) => (
            <div
              key={theme.key}
              className="flex items-center gap-2 p-3 bg-white border rounded-md"
            >
              <Rss className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-sm flex-1 truncate">{theme.name}</span>
              <a
                href={`/feed.xml?temas=${theme.key}`}
                className="text-xs text-muted-foreground hover:text-orange-600 transition-colors"
                title="RSS"
              >
                RSS
              </a>
              <a
                href={`/feed.atom?temas=${theme.key}`}
                className="text-xs text-muted-foreground hover:text-orange-600 transition-colors"
                title="Atom"
              >
                Atom
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-muted/30 rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-primary mb-3">
          Como usar os feeds
        </h3>
        <ol className="space-y-2 text-sm text-primary/80 list-decimal ml-5">
          <li>
            Escolha o feed desejado ou use o construtor acima para criar um
            personalizado
          </li>
          <li>
            Copie a URL do feed no formato de sua preferência (RSS, Atom ou
            JSON)
          </li>
          <li>
            Cole a URL no seu leitor de feeds favorito (Feedly, NewsBlur,
            Thunderbird, etc.)
          </li>
          <li>Pronto! Você receberá as notícias automaticamente</li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">
          Os feeds são atualizados a cada 10 minutos e contêm as 20 notícias
          mais recentes para os filtros selecionados.
        </p>
      </div>
    </div>
  )
}
