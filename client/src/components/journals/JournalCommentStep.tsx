import { memo } from 'react'
import type { ChangeEvent } from 'react'
import { Icon } from '../Icon'

interface JournalCommentStepProps {
  memo: string
  comment: string
  photoAnalysisCount: number
  trainingCount: number
  generating: boolean
  onMemoChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onCommentChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onGenerateComment: () => void
}

const JournalCommentStep = memo(function JournalCommentStep({
  memo,
  comment,
  photoAnalysisCount,
  trainingCount,
  generating,
  onMemoChange,
  onCommentChange,
  onGenerateComment,
}: JournalCommentStepProps) {
  return (
    <div className="px-5 py-6 space-y-6">
      <div className="text-center mb-4">
        <Icon icon="solar:pen-new-square-bold" className="size-12 text-primary mb-2" />
        <h2 className="text-lg font-bold">今日の様子</h2>
        <p className="text-sm text-muted-foreground">飼い主さんへのメッセージを書きましょう</p>
      </div>

      {/* メモ入力エリア */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon icon="solar:notes-bold" className="size-5 text-chart-4" />
          <span className="text-sm font-bold">メモ書き（AIが清書します）</span>
        </div>
        <textarea
          value={memo}
          onChange={onMemoChange}
          className="w-full h-24 bg-muted/50 border-0 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
          placeholder="走り書きでOK！例：今日はオスワリ完璧、他のワンちゃんとも仲良く遊べた、少し興奮気味だったけど落ち着いてトレーニングできた"
        />
      </div>

      {/* AI生成時に使われる情報の表示 */}
      <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 mb-2">
          <Icon icon="solar:info-circle-bold" className="size-4" />
          <span className="font-medium">AIが参照する情報</span>
        </div>
        <div className="space-y-1">
          <p>
            ✓ メモ書き
            {memo.trim() ? ` (${memo.length}文字)` : ' (未入力)'}
          </p>
          <p>
            ✓ 写真解析
            {photoAnalysisCount > 0 ? ` (${photoAnalysisCount}枚分)` : ' (なし)'}
          </p>
          <p>
            ✓ トレーニング記録
            {trainingCount > 0 ? ` (${trainingCount}項目)` : ' (未入力)'}
          </p>
        </div>
      </div>

      {/* AI生成ボタン */}
      <button
        type="button"
        onClick={onGenerateComment}
        disabled={generating}
        className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <Icon icon="solar:spinner-bold" className="size-5 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Icon icon="solar:magic-stick-3-bold" className="size-5" />
            AIでコメントを生成
          </>
        )}
      </button>

      {/* 生成されたコメント */}
      <div className="relative">
        <label className="text-sm font-bold flex items-center gap-2 mb-2">
          <Icon icon="solar:document-text-bold" className="size-4 text-primary" />
          AIが生成したコメント（編集可能）
        </label>
        <textarea
          value={comment}
          onChange={onCommentChange}
          className="w-full h-56 bg-card border border-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
          placeholder="今日のワンちゃんの様子を記入してください..."
        />
        <p className="absolute bottom-3 right-3 text-xs text-muted-foreground">
          {comment.length}文字
        </p>
      </div>
    </div>
  )
})

export default JournalCommentStep
