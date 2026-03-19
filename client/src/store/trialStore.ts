import { create } from 'zustand'
import api from '../api/client'
import type { GuideStep, TrialGuideData, CompleteStepResponse } from '../types/trial'

interface TrialState {
  // data
  isTrial: boolean
  daysRemaining: number
  trialStoreCode: string
  guideCompleted: boolean
  steps: GuideStep[]
  currentStep: GuideStep | null

  // UI state
  showCelebration: boolean
  showAllCompleteCelebration: boolean
  celebrationStepKey: string | null

  // actions
  fetchGuide: () => Promise<void>
  completeStep: (stepKey: string) => Promise<CompleteStepResponse | null>
  dismissCelebration: () => void
  dismissAllCompleteCelebration: () => void
  reset: () => void
}

const INITIAL_STATE = {
  isTrial: false,
  daysRemaining: 0,
  trialStoreCode: '',
  guideCompleted: false,
  steps: [] as GuideStep[],
  currentStep: null as GuideStep | null,
  showCelebration: false,
  showAllCompleteCelebration: false,
  celebrationStepKey: null as string | null,
}

export const useTrialStore = create<TrialState>((set, get) => ({
  ...INITIAL_STATE,

  fetchGuide: async () => {
    try {
      const { data } = await api.get('/trial/guide')
      console.log('[TrialStore] fetchGuide response:', JSON.stringify(data))
      if (data.success && data.data) {
        const guide: TrialGuideData = data.data
        set({
          isTrial: guide.is_trial,
          daysRemaining: guide.days_remaining,
          trialStoreCode: guide.trial_store_code || '',
          guideCompleted: guide.guide_completed,
          steps: guide.steps,
          currentStep: guide.current_step,
        })
      } else {
        console.warn('[TrialStore] fetchGuide: success=false or no data', data)
      }
    } catch (error) {
      console.error('[TrialStore] fetchGuide error:', error)
      // Non-trial users will get 404 or the response will have is_trial: false
      // In that case, just keep default state
    }
  },

  completeStep: async (stepKey: string) => {
    try {
      const { data } = await api.post(`/trial/guide/${stepKey}/complete`)
      if (data.success && data.data) {
        const result: CompleteStepResponse = data.data

        if (result.celebration) {
          set({ showAllCompleteCelebration: true })
        } else {
          set({
            showCelebration: true,
            celebrationStepKey: stepKey,
          })
        }

        // Refresh guide data
        await get().fetchGuide()
        return result
      }
      return null
    } catch (error) {
      console.error('Failed to complete step:', error)
      return null
    }
  },

  dismissCelebration: () => set({ showCelebration: false, celebrationStepKey: null }),
  dismissAllCompleteCelebration: () => set({ showAllCompleteCelebration: false }),
  reset: () => set(INITIAL_STATE),
}))
