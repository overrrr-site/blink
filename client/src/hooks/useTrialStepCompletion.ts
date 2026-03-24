import { useEffect, useRef } from 'react'
import { useTrialStore } from '../store/trialStore'

/**
 * トライアルガイドのステップ完了を自動検知するフック。
 * condition が true になると、該当ステップの完了APIを自動呼び出しする。
 * ステップがアンロック済み＆未完了であれば、currentStep以外でも完了可能。
 */
export function useTrialStepCompletion(stepKey: string, condition: boolean): void {
  const { isTrial, guideCompleted, steps, completeStep } = useTrialStore()
  const completedRef = useRef(false)

  useEffect(() => {
    if (!isTrial || guideCompleted) return
    if (completedRef.current) return

    // アンロック済み＆未完了のステップのみ完了可能
    const step = steps.find((s) => s.step_key === stepKey)
    if (!step || !step.unlocked || step.completed) return

    if (condition) {
      completedRef.current = true
      completeStep(stepKey)
    }
  }, [condition, isTrial, guideCompleted, steps, stepKey, completeStep])
}
