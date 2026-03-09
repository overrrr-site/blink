import { useEffect, useState } from 'react'
import { BTN_TERTIARY } from '../../utils/styles'

interface WelcomeModalProps {
  onSelectAdmin: () => void
  onSelectStaff: () => void
  onSkip: () => void
}

export default function WelcomeModal({
  onSelectAdmin,
  onSelectStaff,
  onSkip,
}: WelcomeModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation on next frame
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
          visible
            ? 'scale-100 opacity-100'
            : 'scale-95 opacity-0'
        }`}
      >
        {/* Title */}
        <h2 className="text-center text-xl font-bold text-foreground">
          {'🐾 Blink\u3078\u3088\u3046\u3053\u305D\uFF01'}
        </h2>

        <p className="mt-3 text-center text-sm text-muted-foreground">
          あなたの役割を教えてください。
        </p>

        {/* Role cards */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onSelectAdmin}
            className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-muted active:scale-[0.98]"
          >
            <span className="text-sm font-bold text-foreground">
              {'⚙️ 管理者'}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              LINE・Googleカレンダーの連携設定を行い、園の運営を管理する
            </p>
          </button>

          <button
            type="button"
            onClick={onSelectStaff}
            className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-muted active:scale-[0.98]"
          >
            <span className="text-sm font-bold text-foreground">
              {'🐕 スタッフ'}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              予約確認・連絡帳チェックなど日々の業務にBlinkを使う
            </p>
          </button>
        </div>

        {/* Skip link */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onSkip}
            className={`${BTN_TERTIARY} px-4 py-2 text-xs`}
          >
            {'スキップして始める \u2192'}
          </button>
        </div>
      </div>
    </div>
  )
}
