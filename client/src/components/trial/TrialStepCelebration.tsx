import { useEffect } from 'react'
import { GuideCharacter } from './GuideCharacter'
import { useTrialStore } from '../../store/trialStore'

const ENCOURAGEMENT: Record<string, string> = {
  register_customer: '飼い主さんの登録ができました！次は予約を作ってみましょう。',
  create_reservation: '予約の作成ができました！次は連絡帳を書いてみましょう。',
  write_record: '連絡帳が書けました！次はLINEの設定をしましょう。',
  link_line_account: 'LINEの連携ができました！次はスタッフ用メモを書いてみましょう。',
  write_internal_notes: '内部記録が書けました！次はLINEで通知を送ってみましょう。',
  send_line_notification: 'LINE通知が送れました！最後にLINEで届いた連絡帳を確認しましょう。',
  check_liff_app: 'すべてのステップが完了です！おめでとうございます！',
}

interface TrialStepCelebrationProps {
  stepKey: string
  stepTitle: string
  onDismiss: () => void
}

export function TrialStepCelebration({ stepKey, stepTitle, onDismiss }: TrialStepCelebrationProps) {
  const { steps } = useTrialStore()
  const completedCount = steps.filter(s => s.completed).length + 1

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-card border border-border shadow-xl rounded-2xl px-6 py-5 animate-bounce-in text-center max-w-xs">
        <GuideCharacter expression="celebrate" size="lg" className="mx-auto mb-3" />
        <p className="text-sm font-bold text-foreground">{stepTitle}</p>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {ENCOURAGEMENT[stepKey] || '完了しました！'}
        </p>
        <div className="mt-2 inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full">
          {completedCount}/{steps.length} 完了
        </div>
      </div>
    </div>
  )
}
