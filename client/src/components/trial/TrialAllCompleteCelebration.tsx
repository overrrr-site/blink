import { useNavigate } from 'react-router-dom'

interface TrialAllCompleteCelebrationProps {
  onDismiss: () => void
}

export function TrialAllCompleteCelebration({ onDismiss }: TrialAllCompleteCelebrationProps) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center space-y-6 animate-bounce-in">
        <div className="text-6xl">🎉</div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            おめでとうございます！
          </h2>
          <p className="text-sm text-muted-foreground">
            Blinkの基本操作をマスターしました。
            <br />
            自由にすべての機能をお試しください。
          </p>
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
