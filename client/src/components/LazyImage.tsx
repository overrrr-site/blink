import { useState } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}

export function LazyImage({ src, alt, className = '', width, height }: LazyImageProps): JSX.Element {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const aspectRatio = width && height ? `${width}/${height}` : undefined

  if (error) {
    return (
      <div
        className={`bg-muted flex items-center justify-center ${className}`}
        style={{ aspectRatio }}
      >
        <span className="text-muted-foreground text-xs">画像なし</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
