import { useEffect, useRef, useState } from 'react'
import { useOnboardingState } from '../../hooks/useOnboardingState'

interface CoachMarkProps {
  /** ヒントの一意なID */
  id: string
  /** 対象要素のdata属性セレクター（例: '[data-coach="card-expand"]'） */
  target: string
  /** 表示するメッセージ */
  message: string
  /** 吹き出しの位置 */
  position?: 'top' | 'bottom'
}

export default function CoachMark({
  id,
  target,
  message,
  position = 'bottom',
}: CoachMarkProps) {
  const { onboarding, completeHint } = useOnboardingState()
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const alreadyCompleted = onboarding?.completedHints?.includes(id)

  useEffect(() => {
    if (alreadyCompleted || !onboarding) return

    // 少し遅延させてDOMがレンダリングされてから要素を探す
    const timer = setTimeout(() => {
      const el = document.querySelector(target)
      if (!el) return

      const rect = el.getBoundingClientRect()
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
      setVisible(true)
    }, 800)

    return () => clearTimeout(timer)
  }, [target, alreadyCompleted, onboarding])

  if (!visible || !coords || alreadyCompleted) return null

  const tooltipTop =
    position === 'bottom'
      ? coords.top + 60
      : coords.top - 12

  async function handleDismiss() {
    setVisible(false)
    await completeHint(id)
  }

  return (
    <>
      {/* 背景オーバーレイ（薄い） */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleDismiss}
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
          <p className="text-xs leading-relaxed">{message}</p>
          <button
            onClick={handleDismiss}
            className="mt-2 text-[10px] text-background/60 hover:text-background/80 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </>
  )
}
