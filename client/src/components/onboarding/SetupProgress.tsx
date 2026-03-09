import { Icon } from '../Icon'
import type { SetupStatus } from '../../hooks/useOnboardingState'

interface SetupProgressProps {
  lineStatus: SetupStatus
  gcalStatus: SetupStatus
  onResume: () => void
}

interface BadgeConfig {
  label: string
  completed: boolean
}

function StatusBadge({ label, completed }: BadgeConfig) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
        completed
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {completed ? (
        <Icon icon="solar:check-circle-bold" className="size-3.5" />
      ) : (
        <Icon icon="solar:clock-circle-linear" className="size-3.5" />
      )}
      {label}
    </span>
  )
}

export default function SetupProgress({
  lineStatus,
  gcalStatus,
  onResume,
}: SetupProgressProps) {
  const lineCompleted = lineStatus === 'completed'
  const gcalCompleted = gcalStatus === 'completed'

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900 mb-2">
            セットアップが完了していません
          </p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label="LINE連携" completed={lineCompleted} />
            <StatusBadge
              label="Googleカレンダー"
              completed={gcalCompleted}
            />
          </div>
        </div>
        <button
          onClick={onResume}
          className="shrink-0 bg-amber-600 text-white rounded-xl font-bold text-xs px-4 min-h-[48px] hover:bg-amber-700 active:scale-[0.98] transition-all"
        >
          設定を続ける
        </button>
      </div>
    </div>
  )
}
