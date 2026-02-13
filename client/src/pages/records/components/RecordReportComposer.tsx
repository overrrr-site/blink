import type { RefObject } from 'react'
import { Icon } from '@/components/Icon'
import type { AISuggestionData, AIInputTraceItem } from '@/types/ai'
import type { NotesData } from '@/types/record'
import NotesForm from './NotesForm'
import RequiredSection from './RequiredSection'

interface BaseReportComposerProps {
  notes: NotesData
  onNotesChange: (next: NotesData) => void
}

interface CreateReportComposerProps extends BaseReportComposerProps {
  mode: 'create'
  aiEnabled: boolean
  reportSuggestion: AISuggestionData | null
  missingInputCount: number
  firstMissingField?: string
  selectedReportTone: 'formal' | 'casual'
  reportSectionRef: RefObject<HTMLDivElement>
  internalMemoSectionRef: RefObject<HTMLDivElement>
  onJumpToField: (fieldKey: string) => void
  onGenerateReport: () => void
  onToneSelect: (tone: 'formal' | 'casual') => void
  onAISuggestionAction: (editedText?: string) => void
  onAISuggestionDismiss: () => void
}

interface DetailReportComposerProps extends BaseReportComposerProps {
  mode: 'detail'
  aiSuggestion?: AISuggestionData | null
  inputTrace?: AIInputTraceItem[]
  generatedFrom?: string[]
  onRegenerate?: () => void
  onToneChange?: (tone: 'formal' | 'casual') => void
  onJumpToField?: (fieldKey: string) => void
  onAISuggestionAction?: (editedText?: string) => void
  onAISuggestionDismiss?: () => void
}

type RecordReportComposerProps = CreateReportComposerProps | DetailReportComposerProps

export default function RecordReportComposer(props: RecordReportComposerProps) {
  if (props.mode === 'detail') {
    return (
      <NotesForm
        data={props.notes}
        onChange={props.onNotesChange}
        aiSuggestion={props.aiSuggestion}
        inputTrace={props.inputTrace}
        generatedFrom={props.generatedFrom}
        onRegenerate={props.onRegenerate}
        onToneChange={props.onToneChange}
        onJumpToField={props.onJumpToField}
        onAISuggestionAction={props.onAISuggestionAction}
        onAISuggestionDismiss={props.onAISuggestionDismiss}
      />
    )
  }

  return (
    <>
      {props.aiEnabled ? (
        <div className="mx-4 mt-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">AIで報告文を作成</p>
              <p className="text-xs text-muted-foreground mt-1">上の入力内容をもとに生成します</p>
            </div>
            {props.missingInputCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (props.firstMissingField) props.onJumpToField(props.firstMissingField)
                }}
                className="shrink-0 rounded-full bg-chart-4/10 px-2.5 py-1 text-[11px] font-bold text-chart-4 hover:bg-chart-4/20 active:scale-95 transition-all"
              >
                未入力 {props.missingInputCount}項目
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={props.onGenerateReport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <Icon icon="solar:magic-stick-3-bold" width="14" height="14" />
              作成する
            </button>
            <button
              type="button"
              onClick={() => props.onToneSelect('formal')}
              className={`rounded-lg border px-3 py-2 text-xs font-bold active:scale-[0.98] transition-all ${
                props.selectedReportTone === 'formal'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              丁寧
            </button>
            <button
              type="button"
              onClick={() => props.onToneSelect('casual')}
              className={`rounded-lg border px-3 py-2 text-xs font-bold active:scale-[0.98] transition-all ${
                props.selectedReportTone === 'casual'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              カジュアル
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            文体を選んでから「作成する」を押すと生成します。
          </p>

          {props.reportSuggestion?.preview && !props.reportSuggestion.dismissed && !props.reportSuggestion.applied && (
            <div className="mt-3 rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-bold text-muted-foreground mb-2">生成プレビュー</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{props.reportSuggestion.preview}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => props.onAISuggestionAction(props.reportSuggestion?.preview)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  この内容を反映
                </button>
                <button
                  type="button"
                  onClick={props.onAISuggestionDismiss}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted active:scale-[0.98] transition-all"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mx-4 mt-4 rounded-2xl border border-border bg-white p-4 text-xs text-muted-foreground">
          AIアシスタントはオフです。ヘッダー右上の設定から有効化できます。
        </div>
      )}

      <div ref={props.reportSectionRef}>
        <RequiredSection title="飼い主への報告文" completed={!!props.notes.report_text?.trim()}>
          <textarea
            value={props.notes.report_text || ''}
            onChange={(e) => props.onNotesChange({ ...props.notes, report_text: e.target.value })}
            placeholder="今日の様子を飼い主さんにお伝えする文章を入力してください"
            className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-border resize-y focus:outline-none focus:ring-2 focus:ring-orange-200"
            style={{ minHeight: 120 }}
          />
        </RequiredSection>
      </div>

      <div ref={props.internalMemoSectionRef} className="mx-4 mt-4 rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon icon="solar:lock-keyhole-bold" width="16" height="16" className="text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">内部メモ（飼い主に非公開）</h3>
        </div>
        <textarea
          value={props.notes.internal_notes || ''}
          onChange={(e) => props.onNotesChange({ ...props.notes, internal_notes: e.target.value })}
          placeholder="スタッフ間の申し送りなど"
          className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-border resize-none focus:outline-none focus:ring-2 focus:ring-border"
          style={{ minHeight: 88 }}
        />
      </div>
    </>
  )
}
