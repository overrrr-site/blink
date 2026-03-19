import { useState } from 'react'
import { Icon } from '../Icon'
import { useTrialStore } from '../../store/trialStore'
import { useToast } from '../Toast'
import lineDemoQr from '../../assets/line-demo-qr.png'

interface GuideStep {
  step_number: number
  step_key: string
  title: string
  description: string
  action_url: string
  unlocked: boolean
  completed: boolean
  completed_at: string | null
}

interface TrialStepCardProps {
  step: GuideStep
}

export function TrialStepCard({ step }: TrialStepCardProps) {
  // Completed state
  if (step.completed) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg opacity-50">
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-xs text-muted-foreground line-through">{step.title}</span>
      </div>
    )
  }

  // Locked state
  if (!step.unlocked) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg opacity-30">
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Icon icon="solar:lock-bold" className="size-3 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground">{step.title}</span>
      </div>
    )
  }

  // Active (current) state - special UI for certain steps
  if (step.step_key === 'link_line_account') {
    return <LinkLineAccountStep step={step} />
  }

  if (step.step_key === 'check_liff_app') {
    return <CheckLiffAppStep step={step} />
  }

  // Active (current) state - コンパクト表示（ナビゲーションはコーチマークが担当）
  return (
    <div
      className="border border-primary/30 bg-primary/5 rounded-lg px-3 py-2.5 space-y-1"
      data-trial-step={step.step_key}
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">{step.step_number}</span>
        </div>
        <span className="text-xs font-bold text-foreground">{step.title}</span>
      </div>
      <p className="text-[11px] text-muted-foreground pl-7 leading-relaxed">{step.description}</p>
    </div>
  )
}

/** LINE通知設定 - QRコード + 店舗コード表示 */
function LinkLineAccountStep({ step }: { step: GuideStep }) {
  const { trialStoreCode } = useTrialStore()
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(trialStoreCode)
      setCopied(true)
      showToast('店舗コードをコピーしました', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('コピーに失敗しました', 'error')
    }
  }

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-lg px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">{step.step_number}</span>
        </div>
        <span className="text-xs font-bold text-foreground">{step.title}</span>
      </div>

      <div className="pl-7 space-y-2.5">
        {/* 手順 */}
        <div className="space-y-1.5 text-[11px] text-muted-foreground">
          <p><b className="text-primary">①</b> 下のQRからデモ用LINE公式アカウントを友だち追加</p>
          <p><b className="text-primary">②</b> トーク画面で店舗コードを送信</p>
        </div>

        {/* QRコード */}
        <div className="flex justify-center">
          <img
            src={lineDemoQr}
            alt="デモ用LINE公式アカウントのQRコード"
            className="w-28 h-28 rounded-lg border border-border"
          />
        </div>

        {/* 店舗コード表示（コピー可能） */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-between gap-2 bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors group"
        >
          <code className="text-sm font-bold text-foreground tracking-wider">{trialStoreCode}</code>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
            {copied ? (
              <Icon icon="solar:check-circle-bold" className="size-4 text-green-500" />
            ) : (
              <>
                <Icon icon="solar:copy-linear" className="size-4" />
                <span>コピー</span>
              </>
            )}
          </span>
        </button>

        <p className="text-[10px] text-muted-foreground">
          LINEで店舗コードを送信すると自動で完了します
        </p>
      </div>
    </div>
  )
}

/** LIFF確認 - LINEのBlink画面を開く + 手動完了 */
function CheckLiffAppStep({ step }: { step: GuideStep }) {
  const { completeStep } = useTrialStore()
  const [completing, setCompleting] = useState(false)

  async function handleComplete() {
    setCompleting(true)
    await completeStep('check_liff_app')
    setCompleting(false)
  }

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-lg px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">{step.step_number}</span>
        </div>
        <span className="text-xs font-bold text-foreground">{step.title}</span>
      </div>

      <div className="pl-7 space-y-2">
        <p className="text-[11px] text-muted-foreground">
          <Icon icon="simple-icons:line" className="size-3.5 inline-block mr-0.5 -mt-0.5 text-[#06C755]" />
          LINEのBlinkで連絡帳を確認しましょう
        </p>

        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all min-h-[32px] disabled:opacity-50"
        >
          {completing ? '処理中...' : '確認しました ✓'}
        </button>
      </div>
    </div>
  )
}
