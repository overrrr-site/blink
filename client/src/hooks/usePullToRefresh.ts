import { useState, useRef, useCallback, useEffect, type RefObject } from 'react'

interface UsePullToRefreshOptions {
  /** スクロール可能な要素の ref */
  scrollRef: RefObject<HTMLElement | null>
  /** プル閾値を超えてリリースした時のコールバック */
  onRefresh: () => Promise<void>
  /** リフレッシュ発火に必要なプル距離 (default: 60px) */
  threshold?: number
  /** 最大プル距離 (default: 120px) */
  maxPull?: number
  /** 有効/無効 (default: true) */
  enabled?: boolean
}

interface UsePullToRefreshReturn {
  /** 現在のプル距離 (0 = 非プル中) */
  pullDistance: number
  /** リフレッシュ処理中かどうか */
  isRefreshing: boolean
}

export function usePullToRefresh({
  scrollRef,
  onRefresh,
  threshold = 60,
  maxPull = 120,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const pullDistanceRef = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = scrollRef.current
    if (!el || !enabled || isRefreshing) return
    // スクロール位置が先頭の時のみ有効
    if (el.scrollTop > 0) return
    startYRef.current = e.touches[0].clientY
    pullingRef.current = true
  }, [scrollRef, enabled, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullingRef.current || isRefreshing) return
    const el = scrollRef.current
    if (!el) return
    // スクロールが発生した場合はプルをキャンセル
    if (el.scrollTop > 0) {
      pullingRef.current = false
      setPullDistance(0)
      pullDistanceRef.current = 0
      return
    }
    const deltaY = e.touches[0].clientY - startYRef.current
    if (deltaY > 0) {
      // 抵抗係数で弾性フィールを再現
      const resistedDelta = Math.min(deltaY * 0.4, maxPull)
      setPullDistance(resistedDelta)
      pullDistanceRef.current = resistedDelta
      // ネイティブスクロールバウンスを防止
      if (resistedDelta > 5) {
        e.preventDefault()
      }
    } else {
      setPullDistance(0)
      pullDistanceRef.current = 0
    }
  }, [scrollRef, maxPull, isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false
    if (pullDistanceRef.current >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold) // リフレッシュ中は閾値位置で固定
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
        pullDistanceRef.current = 0
      }
    } else {
      setPullDistance(0)
      pullDistanceRef.current = 0
    }
  }, [threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !enabled) return

    // touchmove は passive: false にして preventDefault を許可
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [scrollRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return { pullDistance, isRefreshing }
}
