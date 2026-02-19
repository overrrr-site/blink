import useSWR from 'swr'
import { trainingProfilesApi } from '../api/trainingProfiles'
import type { TrainingProfileData } from '../types/trainingProfile'

export function useTrainingProfile(dogId: string | undefined) {
  const swrKey = dogId ? (['training-profile', dogId] as const) : null

  const { data, error, isLoading, mutate } = useSWR<
    TrainingProfileData,
    unknown,
    readonly [string, string] | null
  >(
    swrKey,
    ([, currentDogId]) => trainingProfilesApi.getProfile(currentDogId),
  )

  const isError = Boolean(error)
  const errorMessage = getErrorMessage(error)
  const status = !dogId
    ? 'idle'
    : isLoading
      ? 'loading'
      : isError
        ? 'error'
        : 'success'

  return {
    data: data ?? null,
    error,
    isLoading,
    mutate,
    isError,
    errorMessage,
    status,
  }
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return 'トレーニングプロフィールの取得に失敗しました'
}
