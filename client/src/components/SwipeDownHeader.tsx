import { useRef, type ReactNode } from 'react'
import { useSwipeDown } from '../hooks/useSwipeDown'

interface SwipeDownHeaderProps {
  onDismiss: () => void
  children: ReactNode
  className?: string
}

export default function SwipeDownHeader({ onDismiss, children, className = '' }: SwipeDownHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const { dragOffset, isDragging } = useSwipeDown({
    targetRef: headerRef,
    onDismiss,
    threshold: 100,
  })

  return (
    <div
      ref={headerRef}
      className={className}
      style={{
        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        opacity: dragOffset > 0 ? Math.max(1 - dragOffset / 200, 0.5) : 1,
        transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <div className="flex justify-center pt-2 pb-0">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>
      {children}
    </div>
  )
}
