import { useEffect, useRef } from 'react'
import { useTrialStore } from '../../store/trialStore'
import { TrialStepCard } from './TrialStepCard'
import { TrialStepCelebration } from './TrialStepCelebration'
import { TrialAllCompleteCelebration } from './TrialAllCompleteCelebration'
import { GuideCharacter } from './GuideCharacter'

const POLL_INTERVAL = 10_000

function getEncouragement(completed: number, total: number): string {
  if (completed === 0) return 'さっそく始めましょう！'
  if (completed === 1) return '最初のステップが完了しました！'
  if (completed < Math.floor(total / 2)) return '順調に進んでいます！'
  if (completed === Math.floor(total / 2)) return 'もう半分クリアしました！'
  if (completed === total - 1) return 'あと1つで完了です！'
  return 'もう少しで全ステップ完了です！'
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

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:bottom-auto lg:top-0 lg:left-auto lg:right-0 lg:w-[300px] lg:h-full">
        <div className="lg:hidden bg-background/80 backdrop-blur-sm" />

        <div className="bg-card border-t lg:border-l border-border shadow-lg lg:shadow-none lg:h-full overflow-y-auto">
          <div className="p-5 space-y-4 max-h-[60vh] lg:max-h-none overflow-y-auto">
            {/* ヘッダー: キャラクター + タイトル */}
            <div className="flex items-start gap-3">
              <GuideCharacter
                expression={completedCount === 0 ? 'waving' : 'default'}
                size="sm"
              />
              <div className="flex-1 space-y-1.5">
                <h3 className="text-base font-bold text-foreground">
                  Blinkを体験しましょう
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {getEncouragement(completedCount, totalSteps)}
                </p>
              </div>
            </div>

            {/* 進捗バー */}
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

            {/* ステップ一覧 */}
            <div className="space-y-1.5">
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
