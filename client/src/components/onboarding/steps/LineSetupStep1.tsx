import { useState } from 'react'
import { Icon } from '../../Icon'
import { BTN_PRIMARY, BTN_TERTIARY } from '../../../utils/styles'

interface StepProps {
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function StepHeader({ step }: { step: number }) {
  const percent = Math.round((step / 5) * 100)
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-foreground">
          LINE連携セットアップ
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          Step {step}/5
        </p>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default function LineSetupStep1({ onNext, onBack }: StepProps) {
  const [selection, setSelection] = useState<'yes' | 'no' | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  return (
    <>
      <div className="px-1 py-2 flex-1">
        <StepHeader step={1} />

        <h3 className="text-base font-bold text-foreground mb-1">
          LINE公式アカウントの確認
        </h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          犬の幼稚園のLINE公式アカウントはすでにお持ちですか？
        </p>

        <div className="space-y-3 mb-6">
          {/* Option: Yes */}
          <button
            type="button"
            onClick={() => {
              setSelection('yes')
              setShowGuide(false)
            }}
            className={`w-full text-left p-4 rounded-xl border transition-colors ${
              selection === 'yes'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selection === 'yes'
                    ? 'border-primary'
                    : 'border-muted-foreground/40'
                }`}
              >
                {selection === 'yes' && (
                  <div className="size-2.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground">
                はい、持っています
              </span>
            </div>
          </button>

          {/* Option: No */}
          <button
            type="button"
            onClick={() => {
              setSelection('no')
              setShowGuide(true)
            }}
            className={`w-full text-left p-4 rounded-xl border transition-colors ${
              selection === 'no'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selection === 'no'
                    ? 'border-primary'
                    : 'border-muted-foreground/40'
                }`}
              >
                {selection === 'no' && (
                  <div className="size-2.5 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">
                  まだ持っていません
                </span>
                <span className="text-xs text-primary ml-2">
                  作成手順を見る
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Collapsible creation guide */}
        {selection === 'no' && showGuide && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-primary mb-3"
            >
              <Icon
                icon="solar:arrow-down-linear"
                className="size-4"
              />
              LINE公式アカウントの作成手順
            </button>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <ol className="list-decimal list-inside text-sm text-foreground space-y-2 leading-relaxed">
                <li>
                  <a
                    href="https://www.linebiz.com/jp/entry/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    LINE公式アカウント作成ページ
                  </a>
                  を開く
                </li>
                <li>「LINE公式アカウントを作成」をクリック</li>
                <li>必要事項を入力してアカウントを作成</li>
                <li>作成後、LINE Official Account Managerにログイン</li>
              </ol>

              <div className="bg-muted rounded-lg h-48 flex items-center justify-center text-sm text-muted-foreground">
                スクリーンショット（後で差し替え）
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-1 py-3 border-t border-border">
        <button
          type="button"
          className={`${BTN_TERTIARY} px-4 flex items-center gap-1`}
          onClick={onBack}
        >
          <Icon icon="solar:arrow-left-linear" className="size-4" />
          戻る
        </button>
        <button
          type="button"
          className={`${BTN_PRIMARY} px-6`}
          onClick={onNext}
        >
          次へ
          <Icon icon="solar:arrow-right-linear" className="size-4 ml-1 inline-block" />
        </button>
      </div>
    </>
  )
}
