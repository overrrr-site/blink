import { useNavigate } from 'react-router-dom'
import { useTrialStore } from '../../store/trialStore'

export function TrialBanner() {
  const { isTrial, guideCompleted, daysRemaining } = useTrialStore()
  const navigate = useNavigate()

  // Only show after guide is completed and still in trial
  if (!isTrial || !guideCompleted) return null

  const isUrgent = daysRemaining <= 3
  const isWarning = daysRemaining <= 7

  return (
    <div
      className={`sticky top-0 z-30 flex items-center justify-between px-4 py-2 text-sm ${
        isUrgent
          ? 'bg-red-600 text-white'
          : isWarning
          ? 'bg-amber-500 text-white'
          : 'bg-primary/10 text-primary'
      }`}
    >
      <span className="font-medium">
        {isUrgent
          ? `⚠️ トライアル残りわずか！あと${daysRemaining}日`
          : `🔶 トライアル中：残り${daysRemaining}日`}
      </span>
      <button
        onClick={() => navigate('/settings/convert')}
        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all min-h-[32px] ${
          isUrgent || isWarning
            ? 'bg-white text-foreground hover:bg-white/90'
            : 'bg-primary text-white hover:bg-primary/90'
        }`}
      >
        本契約に切り替える →
      </button>
    </div>
  )
}
