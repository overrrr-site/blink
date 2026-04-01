import { act, renderHook } from '@testing-library/react'
import type { FormEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReservationCreate } from './useReservationCreate'

const { postMock, showToastMock, trackUxEventMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  showToastMock: vi.fn(),
  trackUxEventMock: vi.fn(),
}))

vi.mock('../api/client', () => ({
  default: {
    post: postMock,
  },
}))

vi.mock('../components/Toast', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}))

vi.mock('../lib/uxAnalytics', () => ({
  getUxIdentity: () => ({
    storeId: 1,
    staffIdHash: 'staff-1',
  }),
  trackUxEvent: trackUxEventMock,
}))

describe('useReservationCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postMock.mockResolvedValue({
      data: {
        id: 17,
        calendar_sync: {
          status: 'failed',
          reason: 'Googleカレンダーの再認証が必要です',
        },
      },
    } as never)
  })

  it('shows a warning toast when reservation save succeeds but Google Calendar sync fails', async () => {
    const onSuccess = vi.fn()
    const onSessionEnd = vi.fn()

    const { result } = renderHook(() => useReservationCreate({
      dateParam: '2026-03-31',
      onSuccess,
      uxSessionId: 'session-1',
      onSessionEnd,
    }))

    act(() => {
      result.current.setSelectedDogId(10)
    })

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as FormEvent)
    })

    expect(postMock).toHaveBeenCalledWith('/reservations', expect.objectContaining({
      dog_id: 10,
      service_type: 'daycare',
    }))
    expect(showToastMock).toHaveBeenCalledWith(
      'Googleカレンダー同期に失敗しました: Googleカレンダーの再認証が必要です',
      'warning',
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onSessionEnd).toHaveBeenCalledWith('success')
  })
})
