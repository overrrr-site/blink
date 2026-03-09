import { Icon } from '../../Icon'
import { BTN_PRIMARY, BTN_TERTIARY } from '../../../utils/styles'

interface StepProps {
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function StepHeader({ step, total, progress }: { step: number; total: number; progress: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold">Googleカレンダー連携</p>
        <p className="text-xs text-muted-foreground">Step {step}/{total}</p>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function GcalSetupStep1({ onNext, onBack }: StepProps) {
  return (
    <div>
      <StepHeader step={1} total={3} progress={33} />

      <p className="text-sm text-foreground leading-relaxed mb-6">
        Blinkの予約をGoogleカレンダーに自動で反映できるようになります。
      </p>

      {/* Guide heading */}
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="solar:lightbulb-bolt-bold" className="size-5 text-amber-500" />
        <p className="text-sm font-bold">どのアカウントを使うべき？</p>
      </div>

      {/* Shared account card */}
      <div className="border border-border rounded-xl p-4 mb-3 bg-card">
        <p className="text-sm font-bold text-foreground mb-1">
          園の共有Googleアカウントがある場合
        </p>
        <div className="flex items-start gap-2 mt-2">
          <Icon
            icon="solar:arrow-right-linear"
            className="size-4 text-primary mt-0.5 shrink-0"
          />
          <div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              そのアカウントがおすすめです。
              <br />
              スタッフ全員のカレンダーに予約が表示されます。
            </p>
          </div>
        </div>
      </div>

      {/* Personal account card */}
      <div className="border border-border rounded-xl p-4 mb-8 bg-card">
        <p className="text-sm font-bold text-foreground mb-1">
          個人のGoogleアカウントしかない場合
        </p>
        <div className="flex items-start gap-2 mt-2">
          <Icon
            icon="solar:arrow-right-linear"
            className="size-4 text-primary mt-0.5 shrink-0"
          />
          <div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ご自身のアカウントでもOKです。
              <br />
              あとから変更もできます。
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button className={`${BTN_TERTIARY} px-4`} onClick={onBack}>
          <Icon icon="solar:arrow-left-linear" className="size-4 mr-1 inline-block" />
          戻る
        </button>
        <button className={`${BTN_PRIMARY} px-6`} onClick={onNext}>
          Googleに接続
          <Icon icon="solar:arrow-right-linear" className="size-4 ml-1 inline-block" />
        </button>
      </div>
    </div>
  )
}
