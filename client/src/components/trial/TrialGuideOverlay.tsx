import { useEffect, useRef } from 'react'
import { Icon } from '../Icon'
import { useTrialStore } from '../../store/trialStore'
import { TrialStepCard } from './TrialStepCard'
import { TrialStepCelebration } from './TrialStepCelebration'
import { TrialAllCompleteCelebration } from './TrialAllCompleteCelebration'
import { GuideCharacter } from './GuideCharacter'
import type { GuideStep } from '../../types/trial'

const POLL_INTERVAL = 10_000

function getEncouragement(completed: number, total: number): string {
  if (completed === 0) return 'さっそく始めましょう！'
  if (completed === 1) return '最初のステップが完了しました！'
  if (completed < Math.floor(total / 2)) return '順調に進んでいます！'
  if (completed === Math.floor(total / 2)) return 'もう半分クリアしました！'
  if (completed === total - 1) return 'あと1つで完了です！'
  return 'もう少しで全ステップ完了です！'
}

function GuidePanelContent({
  completedCount,
  totalSteps,
  steps,
  onClose,
  showCloseButton = false,
}: {
  completedCount: number
  totalSteps: number
  steps: GuideStep[]
  onClose?: () => void
  showCloseButton?: boolean
}) {
  return (
    <div className="p-5 space-y-4 max-h-[60vh] lg:max-h-none overflow-y-auto">
      <div className="flex items-start gap-3">
        <GuideCharacter
          expression={completedCount === 0 ? 'waving' : 'default'}
          size="sm"
        />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground">
                Blinkを体験しましょう
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {getEncouragement(completedCount, totalSteps)}
              </p>
            </div>
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="ガイドを閉じる"
              >
                <Icon icon="solar:close-circle-linear" className="size-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>進捗</span>
          <span>{completedCount}/{totalSteps}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${totalSteps === 0 ? 0 : (completedCount / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        {steps.map(step => (
          <TrialStepCard
            key={step.step_key}
            step={step}
          />
        ))}
      </div>
    </div>
  )
}

export function TrialGuideOverlay() {
  const {
    isTrial,
    guideCompleted,
    steps,
    currentStep,
    showCelebration,
    showAllCompleteCelebration,
    celebrationStepKey,
    fetchGuide,
    guidePanelOpen,
    setGuidePanelOpen,
    dismissCelebration,
    dismissAllCompleteCelebration,
  } = useTrialStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchGuide()
  }, [fetchGuide])

  useEffect(() => {
    if (currentStep?.step_key === 'link_line_account') {
      intervalRef.current = setInterval(() => {
        fetchGuide()
      }, POLL_INTERVAL)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [currentStep?.step_key, fetchGuide])

  if (!isTrial || guideCompleted) return null

  const completedCount = steps.filter(s => s.completed).length
  const totalSteps = steps.length

  return (
    <>
      {showCelebration && celebrationStepKey && (
        <TrialStepCelebration
          stepKey={celebrationStepKey}
          stepTitle={steps.find(s => s.step_key === celebrationStepKey)?.title || ''}
          onDismiss={dismissCelebration}
        />
      )}

      {showAllCompleteCelebration && (
        <TrialAllCompleteCelebration onDismiss={dismissAllCompleteCelebration} />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="bg-background/80 backdrop-blur-sm" />

        <div className="bg-card border-t border-border shadow-lg overflow-y-auto">
          <GuidePanelContent
            completedCount={completedCount}
            totalSteps={totalSteps}
            steps={steps}
          />
        </div>
      </div>

      <div className="hidden lg:block">
        {!guidePanelOpen && (
          <button
            type="button"
            onClick={() => setGuidePanelOpen(true)}
            className="fixed right-0 top-1/2 z-30 w-[224px] -translate-y-1/2 rounded-l-2xl border border-r-0 border-border bg-card/95 px-4 py-4 text-left shadow-lg backdrop-blur transition-all hover:w-[236px] hover:bg-card"
            aria-label="トライアルガイドを開く"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-[0.08em] text-primary">TRIAL GUIDE</p>
                  <p className="mt-1 text-sm font-bold text-foreground line-clamp-2">
                    {currentStep?.title || '次のステップを確認'}
                  </p>
                </div>
                <Icon icon="solar:list-bold" className="size-5 shrink-0 text-muted-foreground" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">進捗</span>
                  <span className="font-bold text-foreground">{completedCount}/{totalSteps}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${totalSteps === 0 ? 0 : (completedCount / totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">詳細を開く</span>
                <Icon icon="solar:alt-arrow-left-linear" className="size-4 text-primary" />
              </div>
            </div>
          </button>
        )}

        {guidePanelOpen && (
          <div className="fixed inset-y-0 right-0 z-40 w-[300px]">
            <div className="bg-card border-l border-border shadow-lg h-full overflow-y-auto">
              <GuidePanelContent
                completedCount={completedCount}
                totalSteps={totalSteps}
                steps={steps}
                onClose={() => setGuidePanelOpen(false)}
                showCloseButton
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
