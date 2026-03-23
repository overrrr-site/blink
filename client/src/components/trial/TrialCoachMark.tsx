import { useEffect, useRef, useState } from 'react'
import { useTrialStore } from '../../store/trialStore'

interface TrialCoachMarkProps {
  /** このコーチマークが表示されるステップキー */
  stepKey: string
  /** 対象要素のセレクター（例: '[data-trial-target="owner-create"]'） */
  target: string
  /** 表示メッセージ */
  message: string
  /** 吹き出しの位置 */
  position?: 'top' | 'bottom'
  /** プライマリターゲットが見つからない場合のフォールバック要素セレクター */
  fallbackTarget?: string
  /** フォールバック時に表示するメッセージ */
  fallbackMessage?: string
}

export default function TrialCoachMark({
  stepKey,
  target,
  message,
  position = 'bottom',
  fallbackTarget,
  fallbackMessage,
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
      // 表示されている要素を見つけるヘルパー
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

  // ステップが変わったらdismissをリセット
  useEffect(() => {
    setDismissed(false)
  }, [currentStep?.step_key])

  if (!visible || !coords || !isActiveStep) return null

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
        className="absolute z-50 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{
          top: tooltipTop,
          left: Math.max(16, Math.min(coords.left, window.innerWidth - 280)),
        }}
      >
        <div className="bg-foreground text-background rounded-xl px-4 py-3 shadow-lg relative">
          {/* 矢印 */}
          <div
            className={`absolute w-3 h-3 bg-foreground rotate-45 ${
              position === 'bottom'
                ? '-top-1.5 left-6'
                : '-bottom-1.5 left-6'
            }`}
          />
          <p className="text-xs leading-relaxed">{usingFallback && fallbackMessage ? fallbackMessage : message}</p>
          <button
            onClick={() => setDismissed(true)}
            className="mt-2 text-[10px] text-background/60 hover:text-background/80 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </>
  )
}
