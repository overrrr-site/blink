import { useState, useRef, useCallback, useEffect, type RefObject } from 'react'

interface UseSwipeDownOptions {
  targetRef: RefObject<HTMLElement | null>
  onDismiss: () => void
  threshold?: number
  maxDrag?: number
  enabled?: boolean
}

interface UseSwipeDownReturn {
  dragOffset: number
  isDragging: boolean
}

export function useSwipeDown({
  targetRef,
  onDismiss,
  threshold = 100,
  maxDrag = 200,
  enabled = true,
}: UseSwipeDownOptions): UseSwipeDownReturn {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef(0)
  const activeRef = useRef(false)
  const dragOffsetRef = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return
    const scrollEl = document.getElementById('main-content')
    if (scrollEl && scrollEl.scrollTop > 0) return

    startYRef.current = e.touches[0].clientY
    activeRef.current = true
    setIsDragging(true)
  }, [enabled])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!activeRef.current) return
    const scrollEl = document.getElementById('main-content')
    if (scrollEl && scrollEl.scrollTop > 0) {
      activeRef.current = false
      setIsDragging(false)
      setDragOffset(0)
      dragOffsetRef.current = 0
      return
    }

    const deltaY = e.touches[0].clientY - startYRef.current
    if (deltaY > 0) {
      const resistedDelta = Math.min(deltaY * 0.5, maxDrag)
      setDragOffset(resistedDelta)
      dragOffsetRef.current = resistedDelta
    } else {
      setDragOffset(0)
      dragOffsetRef.current = 0
    }
  }, [maxDrag])

  const handleTouchEnd = useCallback(() => {
    if (!activeRef.current) return
    activeRef.current = false
    setIsDragging(false)

    if (dragOffsetRef.current >= threshold) {
      onDismiss()
    }
    setDragOffset(0)
    dragOffsetRef.current = 0
  }, [threshold, onDismiss])

  useEffect(() => {
    const el = targetRef.current
    if (!el || !enabled) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [targetRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return { dragOffset, isDragging }
}
