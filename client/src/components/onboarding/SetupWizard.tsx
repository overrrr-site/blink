import { useState } from 'react'
import { Icon } from '../Icon'
import { BTN_PRIMARY, BTN_TERTIARY } from '../../utils/styles'
import { useOnboardingState, type SetupStatus } from '../../hooks/useOnboardingState'
import LineSetupStep1 from './steps/LineSetupStep1'
import LineSetupStep2 from './steps/LineSetupStep2'
import LineSetupStep3 from './steps/LineSetupStep3'
import LineSetupStep4 from './steps/LineSetupStep4'
import LineSetupStep5 from './steps/LineSetupStep5'
import GcalSetupStep1 from './steps/GcalSetupStep1'
import GcalSetupStep2 from './steps/GcalSetupStep2'
import GcalSetupStep3 from './steps/GcalSetupStep3'

interface SetupWizardProps {
  onClose: () => void
}

type ActiveView = 'overview' | 'line' | 'gcal'

function getCompletedCount(line: SetupStatus, gcal: SetupStatus): number {
  let count = 0
  if (line === 'completed') count++
  if (gcal === 'completed') count++
  return count
}

function getProgressPercent(line: SetupStatus, gcal: SetupStatus): number {
  return Math.round((getCompletedCount(line, gcal) / 2) * 100)
}

export default function SetupWizard({ onClose }: SetupWizardProps) {
  const { onboarding, updateOnboarding } = useOnboardingState()
  const [activeView, setActiveView] = useState<ActiveView>('overview')
  const [lineStep, setLineStep] = useState(1)
  const [gcalStep, setGcalStep] = useState(1)

  const lineStatus = onboarding?.setup.line ?? 'not_started'
  const gcalStatus = onboarding?.setup.google_calendar ?? 'not_started'
  const progress = getProgressPercent(lineStatus, gcalStatus)
  const allComplete = lineStatus === 'completed' && gcalStatus === 'completed'

  async function handleStepComplete(
    integration: 'line' | 'google_calendar'
  ) {
    await updateOnboarding({
      setup: { [integration]: 'completed' as SetupStatus },
    })
    setActiveView('overview')
  }

  async function handleDismiss() {
    await updateOnboarding({ dismissed: true })
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Blinkセットアップ"
        className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          {activeView !== 'overview' ? (
            <button
              onClick={() => setActiveView('overview')}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
              aria-label="戻る"
            >
              <Icon
                icon="solar:arrow-left-linear"
                className="size-6 text-foreground"
              />
            </button>
          ) : (
            <div className="min-w-[48px]" />
          )}
          <h2 className="text-lg font-bold">Blinkセットアップ</h2>
          <button
            onClick={handleDismiss}
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
            aria-label="閉じる"
          >
            <Icon
              icon="solar:close-circle-bold"
              className="size-6 text-muted-foreground"
            />
          </button>
        </div>

        {/* LINE setup steps */}
        {activeView === 'line' && (
          <div className="flex-1 px-5 py-6">
            {lineStep === 1 && (
              <LineSetupStep1
                onNext={() => setLineStep(2)}
                onBack={() => { setLineStep(1); setActiveView('overview') }}
                onComplete={() => handleStepComplete('line')}
              />
            )}
            {lineStep === 2 && (
              <LineSetupStep2
                onNext={() => setLineStep(3)}
                onBack={() => setLineStep(1)}
                onComplete={() => handleStepComplete('line')}
              />
            )}
            {lineStep === 3 && (
              <LineSetupStep3
                onNext={() => setLineStep(4)}
                onBack={() => setLineStep(2)}
                onComplete={() => handleStepComplete('line')}
              />
            )}
            {lineStep === 4 && (
              <LineSetupStep4
                onNext={() => setLineStep(5)}
                onBack={() => setLineStep(3)}
                onComplete={() => handleStepComplete('line')}
              />
            )}
            {lineStep === 5 && (
              <LineSetupStep5
                onNext={() => handleStepComplete('line')}
                onBack={() => setLineStep(3)}
                onComplete={() => handleStepComplete('line')}
              />
            )}
          </div>
        )}

        {/* Gcal setup steps */}
        {activeView === 'gcal' && (
          <div className="flex-1 px-5 py-6">
            {gcalStep === 1 && (
              <GcalSetupStep1
                onNext={() => setGcalStep(2)}
                onBack={() => { setGcalStep(1); setActiveView('overview') }}
                onComplete={() => handleStepComplete('google_calendar')}
              />
            )}
            {gcalStep === 2 && (
              <GcalSetupStep2
                onNext={() => setGcalStep(3)}
                onBack={() => setGcalStep(1)}
                onComplete={() => handleStepComplete('google_calendar')}
              />
            )}
            {gcalStep === 3 && (
              <GcalSetupStep3
                onNext={() => handleStepComplete('google_calendar')}
                onBack={() => setGcalStep(2)}
                onComplete={() => handleStepComplete('google_calendar')}
              />
            )}
          </div>
        )}

        {/* Overview */}
        {activeView === 'overview' && (
          <div className="flex-1 px-5 py-6">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  セットアップ進捗
                </p>
                <p className="text-sm font-bold text-foreground">
                  {progress}%
                </p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {allComplete ? (
              /* Completion state */
              <div className="text-center py-12">
                <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Icon
                    icon="solar:check-circle-bold"
                    className="size-8 text-emerald-600"
                  />
                </div>
                <p className="text-lg font-bold mb-2">
                  セットアップ完了
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  すべての連携設定が完了しました
                </p>
                <button
                  className={`${BTN_PRIMARY} w-full px-6`}
                  onClick={onClose}
                >
                  ダッシュボードへ
                </button>
              </div>
            ) : (
              /* Task cards */
              <div className="space-y-3">
                {/* LINE連携 */}
                <TaskCard
                  title="LINE連携"
                  description="LINE公式アカウントと連携して、飼い主様への自動通知を設定します"
                  status={lineStatus}
                  icon="mdi:line"
                  onStart={() => setActiveView('line')}
                />

                {/* Googleカレンダー連携 */}
                <TaskCard
                  title="Googleカレンダー連携"
                  description="Blinkの予約をGoogleカレンダーに自動反映できるようになります"
                  status={gcalStatus}
                  icon="mdi:google"
                  onStart={() => setActiveView('gcal')}
                />
              </div>
            )}

            {/* Dismiss */}
            {!allComplete && (
              <div className="mt-8 text-center">
                <button
                  className={`${BTN_TERTIARY} px-4`}
                  onClick={handleDismiss}
                >
                  あとで設定する（ダッシュボードへ）
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Task card sub-component ─────────────────────────────── */

interface TaskCardProps {
  title: string
  description: string
  status: SetupStatus
  icon: string
  onStart: () => void
}

function TaskCard({ title, description, status, icon, onStart }: TaskCardProps) {
  const isCompleted = status === 'completed'

  return (
    <div
      className={`border rounded-xl p-4 transition-colors ${
        isCompleted
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-card border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div
          className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
            isCompleted ? 'bg-emerald-100' : 'bg-muted'
          }`}
        >
          {isCompleted ? (
            <Icon
              icon="solar:check-circle-bold"
              className="size-5 text-emerald-600"
            />
          ) : (
            <Icon icon={icon} className="size-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground">{title}</p>
            {isCompleted && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                接続済み
              </span>
            )}
            {!isCompleted && (
              <span className="text-xs font-medium text-muted-foreground">
                未設定
              </span>
            )}
          </div>

          {!isCompleted && (
            <>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
              <button
                className={`${BTN_PRIMARY} mt-3 px-5 text-xs`}
                onClick={onStart}
              >
                設定を始める
                <Icon
                  icon="solar:arrow-right-linear"
                  className="size-4 ml-1 inline-block"
                />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
