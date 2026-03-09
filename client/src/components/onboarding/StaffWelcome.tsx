import { useEffect, useState } from 'react'
import { BTN_PRIMARY } from '../../utils/styles'

interface StaffWelcomeProps {
  onStart: () => void
}

export default function StaffWelcome({ onStart }: StaffWelcomeProps) {
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
          visible
            ? 'scale-100 opacity-100'
            : 'scale-95 opacity-0'
        }`}
      >
        {/* Title */}
        <h2 className="text-center text-xl font-bold text-foreground">
          {'🐾 Blink\u3078\u3088\u3046\u3053\u305D\uFF01'}
        </h2>

        {/* Body text */}
        <div className="mt-5 space-y-3 text-center text-sm leading-relaxed text-muted-foreground">
          <p>
            Blinkでは毎日の予約確認と、飼い主さんからの連絡帳チェックがかんたんにできます。
          </p>
          <p>
            まずはダッシュボードから今日の予約を見てみましょう。
          </p>
        </div>

        {/* Start button */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onStart}
            className={`${BTN_PRIMARY} w-48 px-6 py-3`}
          >
            {'始める \u2192'}
          </button>
        </div>
      </div>
    </div>
  )
}
