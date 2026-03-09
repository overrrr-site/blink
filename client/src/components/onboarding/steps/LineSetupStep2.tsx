import { useState } from 'react'
import { Icon } from '../../Icon'
import { BTN_PRIMARY, BTN_TERTIARY, INPUT_CLASS } from '../../../utils/styles'

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

export default function LineSetupStep2({ onNext, onBack }: StepProps) {
  const [liffId, setLiffId] = useState('')
  const [showScreenshot, setShowScreenshot] = useState(false)

  return (
    <>
      <div className="px-1 py-2 flex-1">
        <StepHeader step={2} />

        <h3 className="text-base font-bold text-foreground mb-1">
          LIFF IDの取得と入力
        </h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          LINE DevelopersでLIFFアプリを作成してください。
        </p>

        {/* External link button */}
        <a
          href="https://developers.line.biz/console/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 w-full p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors mb-6"
        >
          <Icon icon="solar:link-round-linear" className="size-5 text-primary shrink-0" />
          <span className="text-sm font-medium text-primary flex-1">
            LINE Developersを開く
          </span>
          <Icon icon="solar:arrow-right-up-linear" className="size-4 text-primary shrink-0" />
        </a>

        {/* LIFF ID input */}
        <p className="text-sm text-foreground mb-3 leading-relaxed">
          LIFFアプリ作成後に表示されるLIFF IDを入力してください。
        </p>

        <div className="mb-4">
          <label
            htmlFor="liff-id"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            LIFF ID
          </label>
          <input
            id="liff-id"
            type="text"
            className={INPUT_CLASS}
            placeholder="例: 1234567890-AbCdEfGh"
            value={liffId}
            onChange={(e) => setLiffId(e.target.value)}
          />
        </div>

        {/* Collapsible screenshot hint */}
        <button
          type="button"
          onClick={() => setShowScreenshot((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-primary mb-3"
        >
          <Icon icon="solar:info-circle-linear" className="size-4" />
          <span className="font-medium">LIFF IDはどこにある？</span>
          <Icon
            icon={showScreenshot ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear'}
            className="size-3.5"
          />
        </button>

        {showScreenshot && (
          <div className="rounded-xl border border-border bg-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              LINE Developersコンソールの「LIFFアプリ」タブで確認できます。
            </p>
            <div className="bg-muted rounded-lg h-48 flex items-center justify-center text-sm text-muted-foreground">
              スクリーンショット（後で差し替え）
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
          disabled={!liffId.trim()}
          onClick={onNext}
        >
          次へ
          <Icon icon="solar:arrow-right-linear" className="size-4 ml-1 inline-block" />
        </button>
      </div>
    </>
  )
}
