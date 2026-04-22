import Link from 'next/link'

type Stat = {
  value: string
  label: string
  href?: string
}

type Props = {
  items: Stat[]
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <>
      <div className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
        {value}
      </div>
      <div className="mt-1 text-xs sm:text-sm text-muted-foreground">
        {label}
      </div>
    </>
  )
}

export function StatsBar({ items }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 rounded-xl border border-border/60 bg-muted/30 p-8">
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="text-center rounded-lg p-2 -m-2 transition-colors hover:bg-primary/5"
          >
            <StatItem value={item.value} label={item.label} />
          </Link>
        ) : (
          <div key={item.label} className="text-center">
            <StatItem value={item.value} label={item.label} />
          </div>
        ),
      )}
    </div>
  )
}
