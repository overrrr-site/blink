import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import type { TrainingProfileData } from '../types/trainingProfile'

export function useTrainingProfile(dogId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<TrainingProfileData>(
    dogId ? `/training-profiles/dogs/${dogId}/all` : null,
    fetcher,
  )

  return {
    data: data ?? null,
    error,
    isLoading,
    mutate,
  }
}
