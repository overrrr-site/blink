import { useState } from 'react'
import { Icon } from '@/components/Icon'
import type { AIInputTraceItem } from '@/types/ai'

type Variant = 'default' | 'warning' | 'success'

const VARIANT_STYLES: Record<Variant, { bg: string; border: string; iconColor: string }> = {
  default: { bg: '#F8F9FF', border: '#E0E7FF', iconColor: '#6366F1' },
  warning: { bg: '#FFFBEB', border: '#FEF3C7', iconColor: '#F59E0B' },
  success: { bg: '#ECFDF5', border: '#D1FAE5', iconColor: '#10B981' },
}

interface AISuggestionProps {
  message: string
  preview?: string
  variant?: Variant
  actionLabel?: string
  inputTrace?: AIInputTraceItem[]
  generatedFrom?: string[]
  onRegenerate?: () => void
  onToneChange?: (tone: 'formal' | 'casual') => void
  onApply: (editedText?: string) => void
  onDismiss: () => void
}

export default function AISuggestion({
  message,
  preview,
  variant = 'default',
  actionLabel = '使う',
  inputTrace,
  generatedFrom,
  onRegenerate,
  onToneChange,
  onApply,
  onDismiss,
}: AISuggestionProps) {
  const [applied, setApplied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedText, setEditedText] = useState(preview || '')
  const style = VARIANT_STYLES[variant]

  if (applied) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#ECFDF5' }}>
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
    <div className="flex items-start gap-3">
      {/* AI Avatar */}
      <div
        className="size-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${style.iconColor}, ${style.iconColor}CC)`,
        }}
      >
        <Icon icon="solar:magic-stick-3-bold" width="18" height="18" className="text-white" />
      </div>

      {/* Chat Bubble */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xs font-bold" style={{ color: style.iconColor }}>
            AI アシスタント
          </span>
          <div
            className="size-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: style.iconColor }}
          />
        </div>

        <div
          className="rounded-2xl rounded-tl-sm p-4 shadow-sm"
          style={{
            backgroundColor: style.bg,
            border: `1px solid ${style.border}`,
          }}
        >
          <p className="text-sm leading-relaxed text-slate-700 mb-3">{message}</p>

          {inputTrace && inputTrace.length > 0 && (
            <div className="mb-3 p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">AIが参照する情報</p>
              <div className="space-y-1.5">
                {inputTrace.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600">{item.label}</span>
                    <span className={item.status === 'present' ? 'text-emerald-600' : 'text-amber-600'}>
                      {item.status === 'present' ? `入力あり${typeof item.count === 'number' ? ` (${item.count})` : ''}` : '未入力'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedFrom && generatedFrom.length > 0 && (
            <div className="mb-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-[11px] text-slate-500">この出力で使用した情報: {generatedFrom.join(' / ')}</p>
            </div>
          )}

          {/* Preview */}
          {preview && !editing && (
            <div className="mb-3 p-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {preview}
            </div>
          )}

          {/* Edit mode */}
          {editing && (
            <div className="mb-3">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={6}
                className="w-full p-3 bg-white rounded-xl border border-slate-300 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (preview) setApplied(true)
                    onApply(preview)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all shadow-sm hover:shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${style.iconColor}, ${style.iconColor}CC)`,
                  }}
                >
                  {actionLabel}
                </button>
                {preview && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true)
                      setEditedText(preview)
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    style={{ border: `1.5px solid ${style.border}` }}
                  >
                    <Icon icon="solar:pen-bold" width="14" height="14" className="inline mr-1" />
                    編集する
                  </button>
                )}
                {onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="px-3 py-2.5 rounded-xl text-[12px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    再生成
                  </button>
                )}
                {onToneChange && (
                  <>
                    <button
                      type="button"
                      onClick={() => onToneChange('formal')}
                      className="px-3 py-2.5 rounded-xl text-[12px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      丁寧
                    </button>
                    <button
                      type="button"
                      onClick={() => onToneChange('casual')}
                      className="px-3 py-2.5 rounded-xl text-[12px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      カジュアル
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                  aria-label="閉じる"
                >
                  <Icon icon="solar:close-bold" width="14" height="14" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setApplied(true)
                    onApply(editedText)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all shadow-sm hover:shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${style.iconColor}, ${style.iconColor}CC)`,
                  }}
                >
                  この内容で適用
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setEditedText(preview || '')
                  }}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
