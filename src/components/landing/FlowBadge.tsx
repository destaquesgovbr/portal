import { Radar, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

type Flow = 'difusao' | 'inteligencia' | 'ambos'

type Props = {
  flow: Flow
  className?: string
}

const config: Record<
  Flow,
  { label: string; className: string; Icon: typeof Radio }
> = {
  difusao: {
    label: 'Difusão',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: Radio,
  },
  inteligencia: {
    label: 'Inteligência',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: Radar,
  },
  ambos: {
    label: 'Difusão + Inteligência',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
    Icon: Radio,
  },
}

export function FlowBadge({ flow, className }: Props) {
  const { label, className: flowClass, Icon } = config[flow]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        flowClass,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
