import { useState } from 'react'
import { Icon } from '@/components/Icon'

type Variant = 'default' | 'warning' | 'success'

const VARIANT_STYLES: Record<Variant, { lineColor: string; bg: string; iconBg: string }> = {
  default: { lineColor: '#6366F1', bg: '#EEF2FF', iconBg: '#6366F1' },
  warning: { lineColor: '#F59E0B', bg: '#FFFBEB', iconBg: '#F59E0B' },
  success: { lineColor: '#10B981', bg: '#ECFDF5', iconBg: '#10B981' },
}

interface AISuggestionProps {
  message: string
  preview?: string
  variant?: Variant
  actionLabel?: string
  onApply: () => void
  onDismiss: () => void
}

export default function AISuggestion({
  message,
  preview,
  variant = 'default',
  actionLabel = '適用する',
  onApply,
  onDismiss,
}: AISuggestionProps) {
  const [applied, setApplied] = useState(false)
  const style = VARIANT_STYLES[variant]

  if (applied) {
    return (
      <div
        className="rounded-xl p-3 flex items-center gap-2"
        style={{ background: '#ECFDF5' }}
      >
        <div className="size-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Icon icon="solar:check-circle-bold" width="12" height="12" className="text-white" />
        </div>
        <span className="text-[13px] font-semibold" style={{ color: '#10B981' }}>
          適用しました
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl shadow-sm overflow-hidden"
      style={{ background: style.bg }}
    >
      {/* Color top line */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${style.lineColor}, ${style.lineColor})`,
        }}
      />

      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div
            className="size-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${style.iconBg}, ${style.iconBg}CC)`,
              boxShadow: `0 2px 4px ${style.lineColor}66`,
            }}
          >
            <Icon icon="solar:magic-stick-3-bold" width="16" height="16" className="text-white" />
          </div>
          <p className="flex-1 text-sm font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
            {message}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="size-6 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors shrink-0"
            aria-label="閉じる"
          >
            <Icon icon="solar:close-bold" width="14" height="14" className="text-slate-400" />
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div className="mb-3 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
            {preview}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setApplied(true)
              onApply()
            }}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${style.lineColor}, ${style.lineColor}CC)`,
              boxShadow: `0 2px 4px ${style.lineColor}40`,
            }}
          >
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            スキップ
          </button>
        </div>
      </div>
    </div>
  )
}
