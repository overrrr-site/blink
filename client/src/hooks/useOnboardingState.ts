import useSWR from 'swr'
import api from '../api/client'
import { fetcher } from '../lib/swr'

export type StaffRole = 'admin' | 'staff'
export type SetupStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped'

export interface OnboardingState {
  role: StaffRole | null
  setup: {
    line: SetupStatus
    google_calendar: SetupStatus
  }
  completedHints: string[]
  dismissed: boolean
  firstLoginAt: string | null
}

const ONBOARDING_KEY = '/staff/me/onboarding'

export function useOnboardingState() {
  const { data, error, isLoading, mutate } = useSWR<OnboardingState>(
    ONBOARDING_KEY,
    fetcher,
    { revalidateOnFocus: false }
  )

  async function updateOnboarding(
    patch: Partial<Pick<OnboardingState, 'role' | 'dismissed'>> & {
      setup?: Partial<OnboardingState['setup']>
    }
  ) {
    const res = await api.patch(ONBOARDING_KEY, patch)
    mutate(res.data, false)
    return res.data as OnboardingState
  }

  async function completeHint(hintId: string) {
    const res = await api.post(`${ONBOARDING_KEY}/hint-complete`, { hintId })
    mutate(res.data, false)
    return res.data as OnboardingState
  }

  const isSetupIncomplete =
    data?.role === 'admin' &&
    (data.setup.line !== 'completed' || data.setup.google_calendar !== 'completed')

  const showWelcome = data ? data.role === null && !data.dismissed : false
  const showSetupBanner = data ? isSetupIncomplete && !data.dismissed : false

  return {
    onboarding: data,
    isLoading,
    error,
    mutate,
    updateOnboarding,
    completeHint,
    showWelcome,
    showSetupBanner,
    isSetupIncomplete,
  }
}
