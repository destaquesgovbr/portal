'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface WidgetCarouselProps {
  children: ReactNode[]
  autoAdvance?: boolean
  autoAdvanceInterval?: number
}

export function WidgetCarousel({
  children,
  autoAdvance = false,
  autoAdvanceInterval = 5000,
}: WidgetCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, onSelect])

  // Auto-advance
  useEffect(() => {
    if (!autoAdvance || !emblaApi) return

    const interval = setInterval(() => {
      emblaApi.scrollNext()
    }, autoAdvanceInterval)

    return () => clearInterval(interval)
  }, [autoAdvance, autoAdvanceInterval, emblaApi])

  return (
    <div className="relative">
      {/* Carousel viewport */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-4">
          {children
            .map((child, i) => ({ child, id: `slide-${i}` }))
            .map(({ child, id }) => (
              <div
                key={id}
                className="flex-[0_0_100%] min-w-0"
                style={{ flex: '0 0 100%' }}
              >
                {child}
              </div>
            ))}
        </div>
      </div>

      {/* Navigation buttons */}
      {canScrollPrev && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={scrollPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full hover:scale-110 z-10"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5 text-primary" />
        </Button>
      )}

      {canScrollNext && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={scrollNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg rounded-full hover:scale-110 z-10"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5 text-primary" />
        </Button>
      )}
    </div>
  )
}
