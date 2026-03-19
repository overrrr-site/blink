import { useEffect, useRef } from 'react'
import { Icon } from '../Icon'
import { useTrialStore } from '../../store/trialStore'
import { TrialStepCard } from './TrialStepCard'
import { TrialStepCelebration } from './TrialStepCelebration'
import { TrialAllCompleteCelebration } from './TrialAllCompleteCelebration'

const POLL_INTERVAL = 10_000 // 10秒

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
    dismissCelebration,
    dismissAllCompleteCelebration,
  } = useTrialStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchGuide()
  }, [fetchGuide])

  // link_line_account ステップ中はポーリングで自動完了を検知
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

  // Not in trial or guide completed - don't show
  if (!isTrial || guideCompleted) return null

  const completedCount = steps.filter(s => s.completed).length
  const totalSteps = steps.length

  return (
    <>
      {/* Step celebration modal */}
      {showCelebration && celebrationStepKey && (
        <TrialStepCelebration
          stepKey={celebrationStepKey}
          stepTitle={steps.find(s => s.step_key === celebrationStepKey)?.title || ''}
          onDismiss={dismissCelebration}
        />
      )}

      {/* All complete celebration */}
      {showAllCompleteCelebration && (
        <TrialAllCompleteCelebration onDismiss={dismissAllCompleteCelebration} />
      )}

      {/* Desktop: fixed right panel / Mobile: bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:bottom-auto lg:top-0 lg:left-auto lg:right-0 lg:w-[300px] lg:h-full">
        {/* Mobile backdrop */}
        <div className="lg:hidden bg-background/80 backdrop-blur-sm" />

        {/* Panel */}
        <div className="bg-card border-t lg:border-l border-border shadow-lg lg:shadow-none lg:h-full overflow-y-auto">
          <div className="p-4 space-y-4 max-h-[60vh] lg:max-h-none overflow-y-auto">
            {/* Header */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Icon icon="solar:paw-bold" className="size-5 text-primary" />
                Blinkを体験しよう
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                操作すると自動でステップが進みます
              </p>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>進捗</span>
                  <span>{completedCount}/{totalSteps}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1">
              {steps.map(step => (
                <TrialStepCard
                  key={step.step_key}
                  step={step}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
