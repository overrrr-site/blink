import { useEffect } from 'react'

interface TrialStepCelebrationProps {
  stepKey: string
  stepTitle: string
  onDismiss: () => void
}

export function TrialStepCelebration({ stepTitle, onDismiss }: TrialStepCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-card border border-border shadow-xl rounded-2xl px-6 py-4 animate-bounce-in text-center">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm font-bold text-foreground">{stepTitle}</p>
        <p className="text-xs text-muted-foreground mt-1">完了しました！</p>
      </div>
    </div>
  )
}
