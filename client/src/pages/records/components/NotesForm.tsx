import type { NotesData } from '@/types/record'
import AISuggestion from './AISuggestion'
import type { AISuggestionData, AIInputTraceItem } from '@/types/ai'

interface NotesFormProps {
  data: NotesData
  onChange: (data: NotesData) => void
  aiSuggestion?: AISuggestionData | null
  inputTrace?: AIInputTraceItem[]
  generatedFrom?: string[]
  onRegenerate?: () => void
  onToneChange?: (tone: 'formal' | 'casual') => void
  onJumpToField?: (fieldKey: string) => void
  onAISuggestionAction?: (editedText?: string) => void
  onAISuggestionDismiss?: () => void
}

export default function NotesForm({
  data,
  onChange,
  aiSuggestion,
  inputTrace = [],
  generatedFrom = [],
  onRegenerate,
  onToneChange,
  onJumpToField,
  onAISuggestionAction,
  onAISuggestionDismiss,
}: NotesFormProps) {
  const missingItems = inputTrace.filter((item) => item.status === 'missing')

  return (
    <div className="space-y-4">
      {inputTrace.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs font-bold text-muted-foreground mb-2">AIが参照する情報</p>
          <div className="space-y-1.5">
            {inputTrace.map((item) => (
              <div key={item.key} className="flex items-center justify-between text-xs gap-2">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={item.status === 'present' ? 'text-chart-2' : 'text-amber-600'}>
                  {item.status === 'present'
                    ? `入力あり${typeof item.count === 'number' ? ` (${item.count})` : ''}`
                    : '未入力'}
                </span>
              </div>
            ))}
          </div>
          {missingItems.length > 0 && (
            <div className="mt-3 border-t border-border pt-2">
              <p className="text-[11px] text-amber-700 mb-2">入力を補うと精度が上がります</p>
              <div className="flex flex-wrap gap-1.5">
                {missingItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onJumpToField?.(item.key)}
                    className="px-2 py-1 rounded-md text-[11px] bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    {item.label}を入力
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {aiSuggestion && !aiSuggestion.dismissed && !aiSuggestion.applied && (
        <AISuggestion
          message={aiSuggestion.message}
          preview={aiSuggestion.preview}
          variant={aiSuggestion.variant}
          actionLabel={aiSuggestion.actionLabel}
          inputTrace={aiSuggestion.input_trace}
          generatedFrom={generatedFrom}
          onRegenerate={onRegenerate}
          onToneChange={onToneChange}
          onApply={(editedText) => onAISuggestionAction?.(editedText)}
          onDismiss={() => onAISuggestionDismiss?.()}
        />
      )}
      {/* 内部メモ */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">
          内部メモ <span className="text-xs text-muted-foreground font-normal">（飼い主に非公開）</span>
        </label>
        <textarea
          value={data.internal_notes || ''}
          onChange={(e) => onChange({ ...data, internal_notes: e.target.value })}
          placeholder="スタッフ間の申し送りなど"
          className="w-full px-3 py-2 bg-background rounded-xl text-sm border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
          style={{ minHeight: 72 }}
        />
      </div>

      {/* 飼い主への報告文 */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">
          飼い主への報告文
        </label>
        <textarea
          value={data.report_text || ''}
          onChange={(e) => onChange({ ...data, report_text: e.target.value })}
          placeholder="今日の様子を飼い主さんにお伝えする文章を入力してください"
          className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-border resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
          style={{ minHeight: 100 }}
        />
      </div>
    </div>
  )
}
