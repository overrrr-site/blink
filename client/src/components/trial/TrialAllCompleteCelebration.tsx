import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GuideCharacter } from './GuideCharacter'
import { Icon } from '../Icon'

interface TrialAllCompleteCelebrationProps {
  onDismiss: () => void
}

export function TrialAllCompleteCelebration({ onDismiss }: TrialAllCompleteCelebrationProps) {
  const navigate = useNavigate()
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([])

  useEffect(() => {
    const pieces = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      color: ['#EA580C', '#F97316', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA'][Math.floor(Math.random() * 6)],
    }))
    setConfetti(pieces)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* 紙吹雪 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {confetti.map(p => (
          <div
            key={p.id}
            className="absolute w-2 h-2 rounded-full animate-confetti"
            style={{
              left: `${p.left}%`,
              top: '-8px',
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center space-y-5 animate-bounce-in">
        <GuideCharacter expression="celebrate" size="lg" className="mx-auto" />

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            おめでとうございます！
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Blinkの基本操作をすべてマスターしました。
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-bold text-foreground mb-2">できるようになったこと</p>
          <CheckItem text="飼い主さん・ワンちゃんの登録" />
          <CheckItem text="予約の作成・管理" />
          <CheckItem text="連絡帳の作成・共有" />
          <CheckItem text="LINEでの通知送信" />
          <CheckItem text="スタッフ用の内部記録" />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              onDismiss()
              navigate('/dashboard')
            }}
            className="w-full px-4 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all min-h-[48px]"
          >
            自由に試してみる
          </button>
          <button
            onClick={() => {
              onDismiss()
              navigate('/settings/convert')
            }}
            className="w-full px-4 py-3 bg-card text-foreground border border-border text-sm font-medium rounded-xl hover:bg-muted active:scale-[0.98] transition-all min-h-[48px]"
          >
            本契約に切り替える
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon icon="solar:check-circle-bold" className="size-4 text-green-500 shrink-0" />
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  )
}
