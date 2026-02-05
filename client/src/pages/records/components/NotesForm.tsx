import type { NotesData } from '@/types/record'
import AISuggestion from './AISuggestion'
import type { AISuggestionData } from '@/types/ai'

interface NotesFormProps {
  data: NotesData
  onChange: (data: NotesData) => void
  aiSuggestion?: AISuggestionData | null
  onAISuggestionAction?: () => void
  onAISuggestionDismiss?: () => void
}

export default function NotesForm({
  data,
  onChange,
  aiSuggestion,
  onAISuggestionAction,
  onAISuggestionDismiss,
}: NotesFormProps) {
  return (
    <div className="space-y-4">
      {aiSuggestion && !aiSuggestion.dismissed && !aiSuggestion.applied && (
        <AISuggestion
          message={aiSuggestion.message}
          preview={aiSuggestion.preview}
          variant={aiSuggestion.variant}
          actionLabel={aiSuggestion.actionLabel}
          onApply={() => onAISuggestionAction?.()}
          onDismiss={() => onAISuggestionDismiss?.()}
        />
      )}
      {/* 内部メモ */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          内部メモ <span className="text-xs text-slate-400 font-normal">（飼い主に非公開）</span>
        </label>
        <textarea
          value={data.internal_notes || ''}
          onChange={(e) => onChange({ ...data, internal_notes: e.target.value })}
          placeholder="スタッフ間の申し送りなど"
          className="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm border-none resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
          style={{ minHeight: 72 }}
        />
      </div>

      {/* 飼い主への報告文 */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">
          飼い主への報告文
        </label>
        <textarea
          value={data.report_text || ''}
          onChange={(e) => onChange({ ...data, report_text: e.target.value })}
          placeholder="今日の様子を飼い主さんにお伝えする文章を入力してください"
          className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-slate-200 resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
          style={{ minHeight: 100 }}
        />
      </div>
    </div>
  )
}
