import { useEffect, useRef, useState } from 'react'
import { useTrialStore } from '../../store/trialStore'
import { GuideCharacter } from './GuideCharacter'

interface TrialCoachMarkProps {
  stepKey: string
  target: string
  title: string
  detail: string
  position?: 'top' | 'bottom'
  fallbackTarget?: string
  fallbackTitle?: string
  fallbackDetail?: string
}

export default function TrialCoachMark({
  stepKey,
  target,
  title,
  detail,
  position = 'bottom',
  fallbackTarget,
  fallbackTitle,
  fallbackDetail,
}: TrialCoachMarkProps) {
  const { isTrial, guideCompleted, currentStep } = useTrialStore()
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const isActiveStep = isTrial && !guideCompleted && currentStep?.step_key === stepKey

  useEffect(() => {
    if (!isActiveStep || dismissed) {
      setVisible(false)
      return
    }

    const timer = setTimeout(() => {
      const findVisibleElement = (selector: string): Element | null => {
        const els = document.querySelectorAll(selector)
        if (els.length === 0) return null
        return Array.from(els).find(e => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        }) || els[0]
      }

      let el = findVisibleElement(target)
      let isFallback = false

      if (!el && fallbackTarget) {
        el = findVisibleElement(fallbackTarget)
        isFallback = true
      }

      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return

      setUsingFallback(isFallback)
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      })
      setVisible(true)
    }, 600)

    return () => clearTimeout(timer)
  }, [target, fallbackTarget, isActiveStep, dismissed])

  useEffect(() => {
    setDismissed(false)
  }, [currentStep?.step_key])

  if (!visible || !coords || !isActiveStep) return null

  const displayTitle = usingFallback && fallbackTitle ? fallbackTitle : title
  const displayDetail = usingFallback && fallbackDetail ? fallbackDetail : detail

  const tooltipTop = position === 'bottom'
    ? coords.top + coords.height + 12
    : coords.top - 12

  return (
    <>
      {/* スポットライト背景 */}
      <div
        className="fixed inset-0 z-40 pointer-events-auto"
        onClick={() => setDismissed(true)}
        style={{
          background: `radial-gradient(ellipse ${coords.width + 32}px ${coords.height + 32}px at ${coords.left + coords.width / 2}px ${coords.top + coords.height / 2}px, transparent 60%, rgba(0,0,0,0.4) 100%)`,
        }}
      />

      {/* 吹き出し */}
      <div
        ref={tooltipRef}
        className="absolute z-50 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{
          top: tooltipTop,
          left: Math.max(16, Math.min(coords.left, window.innerWidth - 360)),
        }}
      >
        <div className="bg-card border border-border rounded-2xl px-4 py-3.5 shadow-xl relative">
          {/* 矢印 */}
          <div
            className={`absolute w-3 h-3 bg-card border-border rotate-45 ${
              position === 'bottom'
                ? '-top-1.5 left-8 border-l border-t'
                : '-bottom-1.5 left-8 border-r border-b'
            }`}
          />
          <div className="flex items-start gap-3">
            <GuideCharacter expression="pointing" size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-snug">{displayTitle}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{displayDetail}</p>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setDismissed(true)}
              className="text-xs text-primary font-medium hover:text-primary/80 transition-colors px-2 py-1"
            >
              わかりました
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
