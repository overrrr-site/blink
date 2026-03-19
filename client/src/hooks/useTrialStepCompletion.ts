import { useEffect, useRef } from 'react'
import { useTrialStore } from '../store/trialStore'

/**
 * トライアルガイドのステップ完了を自動検知するフック。
 * condition が true になると、該当ステップの完了APIを自動呼び出しする。
 */
export function useTrialStepCompletion(stepKey: string, condition: boolean): void {
  const { isTrial, guideCompleted, currentStep, completeStep } = useTrialStore()
  const completedRef = useRef(false)

  useEffect(() => {
    if (!isTrial || guideCompleted) return
    if (currentStep?.step_key !== stepKey) return
    if (completedRef.current) return

    if (condition) {
      completedRef.current = true
      completeStep(stepKey)
    }
  }, [condition, isTrial, guideCompleted, currentStep, stepKey, completeStep])
}
