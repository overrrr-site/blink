import { useState, useEffect, useCallback, type RefObject } from 'react'

export function useScrollFade(ref: RefObject<HTMLElement | null>) {
  const [showRightFade, setShowRightFade] = useState(false)

  const checkScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    checkScroll()

    el.addEventListener('scroll', checkScroll, { passive: true })

    const observer = new ResizeObserver(checkScroll)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      observer.disconnect()
    }
  }, [ref, checkScroll])

  return { showRightFade }
}
