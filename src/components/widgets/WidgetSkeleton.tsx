import type { WidgetLayout } from '@/types/widget'

interface WidgetSkeletonProps {
  layout: WidgetLayout
  count?: number
}

function SkeletonCard() {
  return (
    <div className="border rounded-lg p-4 animate-pulse">
      <div className="h-32 bg-muted rounded mb-3" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    </div>
  )
}

export function WidgetSkeleton({ layout, count = 6 }: WidgetSkeletonProps) {
  const getLayoutClasses = () => {
    switch (layout) {
      case 'list':
        return 'flex flex-col gap-3'
      case 'grid-2':
        return 'grid grid-cols-1 sm:grid-cols-2 gap-4'
      case 'grid-3':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
      case 'carousel':
        return 'flex gap-4'
      default:
        return 'flex flex-col gap-3'
    }
  }

  return (
    <div className="widget-content flex-1 p-4">
      <div className={getLayoutClasses()}>
        {Array.from({ length: count }, (_, i) => `skeleton-${i}`).map((id) => (
          <SkeletonCard key={id} />
        ))}
      </div>
    </div>
  )
}
