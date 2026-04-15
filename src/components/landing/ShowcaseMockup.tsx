import { Bell, LayoutGrid, Newspaper, Rss, Search } from 'lucide-react'

/**
 * ShowcaseMockup renders a fictional government portal in grayscale,
 * with the DGB features highlighted in color to show how they'd
 * integrate visually with an existing agency portal.
 *
 * Each highlighted area has a numbered marker that matches the
 * corresponding CalloutAnnotation below the mockup.
 */
export function ShowcaseMockup() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-8">
      <div className="rounded-lg border border-border bg-background overflow-hidden shadow-sm">
        {/* Fake agency header (grayscale) */}
        <div className="border-b border-border bg-muted/60 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-muted-foreground/30" />
            <div>
              <div className="h-2.5 w-32 rounded bg-muted-foreground/40" />
              <div className="mt-1.5 h-2 w-20 rounded bg-muted-foreground/20" />
            </div>
          </div>

          {/* [1] Search Bar — highlighted */}
          <a href="#callout-1" className="relative block group">
            <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 w-56 shadow-sm ring-2 ring-primary/20 transition group-hover:ring-4 group-hover:ring-primary/30">
              <Search className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-primary font-medium">
                Buscar notícias...
              </span>
            </div>
            <Marker number={1} className="-top-2 -right-2" />
          </a>
        </div>

        {/* Fake agency nav (grayscale) */}
        <div className="border-b border-border bg-muted/30 px-5 py-2 flex items-center gap-5">
          <div className="h-2 w-16 rounded bg-muted-foreground/30" />
          <div className="h-2 w-20 rounded bg-muted-foreground/20" />
          <div className="h-2 w-14 rounded bg-muted-foreground/20" />
          <div className="h-2 w-24 rounded bg-muted-foreground/20" />
          <div className="h-2 w-12 rounded bg-muted-foreground/20" />

          {/* [2] WebPush bell — highlighted */}
          <a href="#callout-2" className="relative ml-auto block group">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-400 bg-violet-50 shadow-sm ring-2 ring-violet-200 transition group-hover:ring-4 group-hover:ring-violet-300">
              <Bell className="h-4 w-4 text-violet-600" />
            </div>
            <Marker number={2} className="-top-2 -right-2" color="violet" />
          </a>
        </div>

        {/* Hero (grayscale) */}
        <div className="px-5 py-6 border-b border-border">
          <div className="h-4 w-2/3 rounded bg-muted-foreground/30" />
          <div className="mt-2 h-2 w-1/2 rounded bg-muted-foreground/20" />
          <div className="mt-4 h-32 rounded bg-muted-foreground/10" />
        </div>

        {/* Content grid: widget + clippings gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
          {/* [3] Widget (2 cols) — highlighted */}
          <a href="#callout-3" className="relative md:col-span-2 block group">
            <div className="rounded-lg border border-blue-400 bg-blue-50/60 p-4 ring-2 ring-blue-200 transition group-hover:ring-4 group-hover:ring-blue-300">
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">
                  Últimas notícias
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-blue-200 bg-background p-2">
                  <div className="h-16 rounded bg-blue-100" />
                  <div className="mt-2 h-2 w-full rounded bg-muted-foreground/30" />
                  <div className="mt-1 h-2 w-3/4 rounded bg-muted-foreground/20" />
                </div>
                <div className="rounded border border-blue-200 bg-background p-2">
                  <div className="h-16 rounded bg-blue-100" />
                  <div className="mt-2 h-2 w-full rounded bg-muted-foreground/30" />
                  <div className="mt-1 h-2 w-3/4 rounded bg-muted-foreground/20" />
                </div>
              </div>
            </div>
            <Marker number={3} className="-top-2 -left-2" color="blue" />
          </a>

          {/* [4] Clippings gallery (1 col) — highlighted */}
          <a href="#callout-4" className="relative block group">
            <div className="rounded-lg border border-emerald-400 bg-emerald-50/60 p-4 ring-2 ring-emerald-200 transition group-hover:ring-4 group-hover:ring-emerald-300">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">
                  Clippings temáticos
                </span>
              </div>
              <div className="space-y-2">
                <div className="rounded border border-emerald-200 bg-background p-2">
                  <div className="h-2 w-full rounded bg-muted-foreground/30" />
                  <div className="mt-1 h-2 w-2/3 rounded bg-muted-foreground/20" />
                </div>
                <div className="rounded border border-emerald-200 bg-background p-2">
                  <div className="h-2 w-full rounded bg-muted-foreground/30" />
                  <div className="mt-1 h-2 w-2/3 rounded bg-muted-foreground/20" />
                </div>
              </div>
            </div>
            <Marker number={4} className="-top-2 -right-2" color="emerald" />
          </a>
        </div>

        {/* [5] Feeds row — highlighted */}
        <div className="px-5 pb-6">
          <a href="#callout-5" className="relative block group">
            <div className="flex items-center gap-3 rounded-lg border border-amber-400 bg-amber-50/60 px-4 py-3 ring-2 ring-amber-200 transition group-hover:ring-4 group-hover:ring-amber-300">
              <Rss className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">
                Assine por RSS, Atom ou JSON
              </span>
              <div className="ml-auto flex gap-2">
                <div className="h-5 w-10 rounded bg-amber-200/60" />
                <div className="h-5 w-10 rounded bg-amber-200/60" />
                <div className="h-5 w-10 rounded bg-amber-200/60" />
              </div>
            </div>
            <Marker number={5} className="-top-2 -left-2" color="amber" />
          </a>
        </div>

        {/* Fake footer (grayscale) */}
        <div className="border-t border-border bg-muted/40 px-5 py-4">
          <div className="h-2 w-1/3 rounded bg-muted-foreground/20" />
          <div className="mt-2 h-2 w-1/4 rounded bg-muted-foreground/15" />
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <span className="font-medium">Legenda:</span> áreas em cor são
        adicionadas pelo DGB · áreas em cinza são do portal do órgão
      </p>
    </div>
  )
}

type MarkerColor = 'primary' | 'blue' | 'emerald' | 'violet' | 'amber'

function Marker({
  number,
  className = '',
  color = 'primary',
}: {
  number: number
  className?: string
  color?: MarkerColor
}) {
  const colorClass: Record<MarkerColor, string> = {
    primary: 'bg-primary text-primary-foreground',
    blue: 'bg-blue-600 text-white',
    emerald: 'bg-emerald-600 text-white',
    violet: 'bg-violet-600 text-white',
    amber: 'bg-amber-600 text-white',
  }
  return (
    <div
      className={`absolute flex h-6 w-6 items-center justify-center rounded-full ${colorClass[color]} text-xs font-bold shadow-md ${className}`}
    >
      {number}
    </div>
  )
}
