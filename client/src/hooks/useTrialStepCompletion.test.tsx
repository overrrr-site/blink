import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { useTrialStepCompletion } from './useTrialStepCompletion'
import { useTrialStore } from '../store/trialStore'

const STEP = {
  step_number: 1,
  step_key: 'write_record',
  title: 'Write record',
  description: '',
  action_url: '',
  unlocked: true,
  completed: false,
  completed_at: null,
}

describe('useTrialStepCompletion', () => {
  beforeEach(() => {
    useTrialStore.setState({
      isTrial: true,
      guideCompleted: false,
      steps: [STEP],
    } as any)
  })

  it('does not retry automatically after a successful completion', async () => {
    const completeStep = vi.fn().mockResolvedValue({ celebration: false })
    useTrialStore.setState({ completeStep } as any)

    const { rerender } = renderHook(
      ({ condition }) => useTrialStepCompletion('write_record', condition),
      { initialProps: { condition: true } }
    )

    await waitFor(() => expect(completeStep).toHaveBeenCalledTimes(1))

    rerender({ condition: false })
    rerender({ condition: true })

    await act(async () => {
      await Promise.resolve()
    })

    expect(completeStep).toHaveBeenCalledTimes(1)
  })

  it('allows a retry on the next user action when completion returns null', async () => {
    const completeStep = vi.fn().mockResolvedValue(null)
    useTrialStore.setState({ completeStep } as any)

    const { rerender } = renderHook(
      ({ condition }) => useTrialStepCompletion('write_record', condition),
      { initialProps: { condition: true } }
    )

    await waitFor(() => expect(completeStep).toHaveBeenCalledTimes(1))

    await act(async () => {
      await Promise.resolve()
    })

    rerender({ condition: false })
    rerender({ condition: true })

    await waitFor(() => expect(completeStep).toHaveBeenCalledTimes(2))
  })

  it('allows a retry on the next user action when completion rejects', async () => {
    const completeStep = vi.fn().mockRejectedValue(new Error('network error'))
    useTrialStore.setState({ completeStep } as any)

    const { rerender } = renderHook(
      ({ condition }) => useTrialStepCompletion('write_record', condition),
      { initialProps: { condition: true } }
    )

    await waitFor(() => expect(completeStep).toHaveBeenCalledTimes(1))

    await act(async () => {
      await Promise.resolve()
    })

    rerender({ condition: false })
    rerender({ condition: true })

    await waitFor(() => expect(completeStep).toHaveBeenCalledTimes(2))
  })
})
