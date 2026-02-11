import { useEffect, useRef, useState } from 'react'

interface GuideTooltipProps {
  target: string
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  onNext?: () => void
  onSkip?: () => void
  onComplete?: () => void
  isLast?: boolean
  stepNumber?: number
  totalSteps?: number
}

function GuideTooltip({
  target,
  title,
  content,
  position = 'bottom',
  onNext,
  onSkip,
  onComplete,
  isLast = false,
  stepNumber = 1,
  totalSteps = 1,
}: GuideTooltipProps): JSX.Element | null {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = document.querySelector(target) as HTMLElement
    if (!element) return

    // 要素をスクロール表示
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // 位置を計算
    const updatePosition = () => {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)
      
      const tooltipRect = tooltipRef.current?.getBoundingClientRect()
      const tooltipHeight = tooltipRect?.height || 200
      const tooltipWidth = tooltipRect?.width || 300

      let top = 0
      let left = 0

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - 16
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'bottom':
          top = rect.bottom + 16
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - tooltipWidth - 16
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + 16
          break
      }

      // 画面外に出ないように調整
      const padding = 16
      if (left < padding) left = padding
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding
      }
      if (top < padding) top = padding
      if (top + tooltipHeight > window.innerHeight - padding) {
        top = window.innerHeight - tooltipHeight - padding
      }

      setTooltipPosition({ top, left })
    }

    // 初期位置計算
    const timer = setTimeout(updatePosition, 100)

    // リサイズ時に再計算
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [target, position])

  if (!targetRect) return null

  return (
    <>
      {/* オーバーレイ（4つのdivで周囲を覆う） */}
      {/* 上部 */}
      <div
        className="fixed bg-black/60 z-[100]"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: targetRect.top,
        }}
      />
      {/* 下部 */}
      <div
        className="fixed bg-black/60 z-[100]"
        style={{
          top: targetRect.bottom,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* 左側 */}
      <div
        className="fixed bg-black/60 z-[100]"
        style={{
          top: targetRect.top,
          left: 0,
          width: targetRect.left,
          height: targetRect.height,
        }}
      />
      {/* 右側 */}
      <div
        className="fixed bg-black/60 z-[100]"
        style={{
          top: targetRect.top,
          left: targetRect.right,
          right: 0,
          height: targetRect.height,
        }}
      />

      {/* ハイライト枠 */}
      <div
        className="fixed z-[101] border-4 border-primary rounded-xl pointer-events-none shadow-lg"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />

      {/* ツールチップ */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={title}
        className="fixed z-[102] bg-card border-2 border-primary rounded-2xl shadow-2xl p-5 max-w-sm"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* ステップ表示 */}
        {totalSteps > 1 && (
          <div className="text-xs text-muted-foreground mb-2 font-medium">
            ステップ {stepNumber} / {totalSteps}
          </div>
        )}

        {/* タイトル */}
        <h3 className="text-base font-bold mb-2">{title}</h3>

        {/* コンテンツ */}
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{content}</p>

        {/* ボタン */}
        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted active:scale-[0.98] transition-all"
            >
              スキップ
            </button>
          )}
          {isLast ? (
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              完了
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              次へ
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default GuideTooltip
