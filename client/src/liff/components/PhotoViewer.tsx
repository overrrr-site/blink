import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icon'

interface PhotoViewerPhoto {
  url: string
  label?: string
}

interface PhotoViewerProps {
  photos: PhotoViewerPhoto[]
  initialIndex?: number
  title?: string
  onClose: () => void
}

export default function PhotoViewer({ photos, initialIndex = 0, title, onClose }: PhotoViewerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const width = scroller.clientWidth
    scroller.scrollTo({ left: width * initialIndex, behavior: 'auto' })
  }, [initialIndex])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const handleScroll = () => {
      const width = scroller.clientWidth
      if (!width) return
      const index = Math.round(scroller.scrollLeft / width)
      setActiveIndex(index)
    }

    scroller.addEventListener('scroll', handleScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 text-white flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="size-10 rounded-full bg-white/10 flex items-center justify-center"
            aria-label="閉じる"
          >
            <Icon icon="solar:close-circle-bold" width="22" height="22" className="text-white" />
          </button>
          {title && <p className="text-sm font-medium">{title}</p>}
        </div>
        <span className="text-xs text-white/70">
          {photos.length > 0 ? `${activeIndex + 1} / ${photos.length}` : '0 / 0'}
        </span>
      </div>

      <div
        ref={scrollerRef}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory"
      >
        {photos.map((photo, index) => (
          <div
            key={`${photo.url}-${index}`}
            className="min-w-full snap-center flex flex-col items-center justify-center px-4 pb-6"
          >
            <img
              src={photo.url}
              alt={photo.label || `写真 ${index + 1}`}
              className="max-h-[75vh] max-w-[92vw] object-contain"
            />
            {photo.label && (
              <p className="mt-3 text-sm text-white/80">{photo.label}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
