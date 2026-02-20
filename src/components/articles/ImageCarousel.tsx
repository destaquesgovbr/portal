'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

interface ImageCarouselProps {
  images: string[]
  alts: string[]
}

export function ImageCarousel({ images, alts }: ImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const scrollTo = useCallback((index: number) => api?.scrollTo(index), [api])

  if (images.length === 0) return null

  return (
    <div className="my-6">
      <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
        <CarouselContent>
          {images.map((src, index) => (
            <CarouselItem key={src}>
              <div className="flex items-center justify-center">
                <img
                  src={src}
                  alt={alts[index] || `Imagem ${index + 1} de ${images.length}`}
                  className="max-w-full max-h-[500px] object-contain rounded-md shadow-sm"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className="-left-5 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
          aria-label="Imagem anterior"
        />
        <CarouselNext
          className="-right-5 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
          aria-label="Proxima imagem"
        />
      </Carousel>

      {count > 1 && (
        <div
          className="flex justify-center gap-2 mt-3"
          role="tablist"
          aria-label="Indicadores de imagem"
        >
          {Array.from({ length: count }).map((_, index) => (
            <button
              type="button"
              key={images[index]}
              onClick={() => scrollTo(index)}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors',
                index === current
                  ? 'bg-[var(--government-blue)]'
                  : 'bg-primary/20 hover:bg-primary/40',
              )}
              role="tab"
              aria-selected={index === current}
              aria-label={`Ir para imagem ${index + 1}`}
            />
          ))}
        </div>
      )}

      <p className="text-center text-sm text-primary/60 mt-1">
        {current + 1} / {count}
      </p>
    </div>
  )
}
