import { useEffect, useState } from 'react'
import { Icon } from '../Icon'
import { BTN_PRIMARY, BTN_TERTIARY } from '../../utils/styles'
import { GuideCharacter } from './GuideCharacter'

interface TrialIntroModalProps {
  onStart: () => void
  onSkip: () => void
}

export default function TrialIntroModal({ onStart, onSkip }: TrialIntroModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-300 ${
        visible ? 'bg-black/40' : 'bg-black/0'
      }`}
    >
      <div
        className={`w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* キャラクター */}
        <div className="flex justify-center mb-4">
          <GuideCharacter expression="waving" size="lg" />
        </div>

        <h2 className="text-center text-xl font-bold text-foreground">
          一緒にBlinkを体験してみましょう！
        </h2>

        <p className="mt-3 text-center text-sm text-muted-foreground leading-relaxed">
          7つのかんたんなステップで、予約管理から連絡帳、LINE通知まで一通りの操作を体験できます。
        </p>

        <p className="mt-1 text-center text-xs text-muted-foreground">
          所要時間：約5分
        </p>

        {/* 体験できること */}
        <div className="mt-5 space-y-2.5">
          <FeatureItem
            icon="solar:calendar-bold"
            text="予約の作成・管理"
          />
          <FeatureItem
            icon="solar:document-text-bold"
            text="連絡帳の作成・飼い主さんへの共有"
          />
          <FeatureItem
            icon="simple-icons:line"
            text="LINEでの通知の受け取り"
          />
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onStart}
            className={`${BTN_PRIMARY} w-full px-6`}
          >
            さっそく始める
            <Icon icon="solar:arrow-right-linear" className="size-4 ml-1 inline-block" />
          </button>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onSkip}
              className={`${BTN_TERTIARY} px-4 py-2 text-xs`}
            >
              あとで体験する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
      <Icon icon={icon} className="size-5 text-primary shrink-0" />
      <span className="text-sm font-medium text-foreground">{text}</span>
    </div>
  )
}
