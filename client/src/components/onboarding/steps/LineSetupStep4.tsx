import { useState } from 'react'
import { Icon } from '../../Icon'
import { BTN_PRIMARY, BTN_TERTIARY } from '../../../utils/styles'
import { useToast } from '../../Toast'

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

export default function LineSetupStep4({ onNext, onBack }: StepProps) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [showScreenshot, setShowScreenshot] = useState(false)

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/liff/webhook`
      : ''

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      showToast('コピーしました', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('コピーに失敗しました', 'error')
    }
  }

  return (
    <>
      <div className="px-1 py-2 flex-1">
        <StepHeader step={4} />

        <h3 className="text-base font-bold text-foreground mb-1">
          Webhook URLの設定
        </h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          以下のWebhook URLをLINE Developersに設定してください。
        </p>

        {/* Webhook URL display + copy */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Webhook URL
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-foreground bg-muted rounded-lg px-3 py-2.5 break-all select-all">
              {webhookUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
              aria-label="コピー"
            >
              <Icon
                icon={copied ? 'solar:check-circle-bold' : 'solar:copy-linear'}
                className={`size-5 ${copied ? 'text-emerald-600' : 'text-primary'}`}
              />
            </button>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="mb-4">
          <p className="text-sm font-bold text-foreground mb-3">設定手順</p>
          <ol className="list-decimal list-inside text-sm text-foreground space-y-2.5 leading-relaxed">
            <li>
              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                LINE Developersコンソール
              </a>
              を開く
            </li>
            <li>Messaging APIチャネルを選択</li>
            <li>「Messaging API設定」タブを開く</li>
            <li>「Webhook URL」の欄に上記URLを貼り付ける</li>
            <li>「Webhookの利用」をオンにする</li>
            <li>「検証」ボタンで接続を確認</li>
          </ol>
        </div>

        {/* Collapsible screenshot hint */}
        <button
          type="button"
          onClick={() => setShowScreenshot((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-primary mb-3"
        >
          <Icon icon="solar:info-circle-linear" className="size-4" />
          <span className="font-medium">スクリーンショットで確認</span>
          <Icon
            icon={showScreenshot ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear'}
            className="size-3.5"
          />
        </button>

        {showScreenshot && (
          <div className="rounded-xl border border-border bg-card p-4 mb-4">
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
          onClick={onNext}
        >
          次へ
          <Icon icon="solar:arrow-right-linear" className="size-4 ml-1 inline-block" />
        </button>
      </div>
    </>
  )
}
