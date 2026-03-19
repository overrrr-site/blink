import { useNavigate } from 'react-router-dom'

export function TrialPaymentBlocker() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
      <h2 className="text-base font-bold text-foreground">
        決済機能は本契約後にご利用いただけます
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        トライアル期間中は決済機能をお試しいただけません。
        本契約に切り替えると、すべての機能がご利用可能になります。
      </p>
      <button
        onClick={() => navigate('/settings/convert')}
        className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all min-h-[48px]"
      >
        本契約に切り替える →
      </button>
    </div>
  )
}
