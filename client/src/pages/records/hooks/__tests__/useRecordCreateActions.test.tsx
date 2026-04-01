import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recordsApi } from '../../../../api/records'
import { useRecordCreateActions } from '../useRecordCreateActions'

vi.mock('../../../../api/records', () => ({
  recordsApi: {
    create: vi.fn(),
    share: vi.fn(),
  },
}))

describe('useRecordCreateActions', () => {
  const recordsApiMock = vi.mocked(recordsApi)

  beforeEach(() => {
    vi.clearAllMocks()
    recordsApiMock.create.mockResolvedValue({ data: { id: 77 } } as never)
    recordsApiMock.share.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: 'カルテ通知の送信に失敗したため、共有を完了できませんでした',
          reason: 'LINE連携済みの飼い主ではありません',
        },
      },
    } as never)
  })

  it('creates the record as saved and avoids success toast when share delivery fails', async () => {
    const showToast = vi.fn()
    const navigate = vi.fn()
    const confirm = vi.fn().mockResolvedValue(true)
    const finishSession = vi.fn()
    const trackRecordEvent = vi.fn()
    const onRecordSaved = vi.fn()

    const { result } = renderHook(() => useRecordCreateActions({
      selectedDogId: 1,
      reservationId: '12',
      recordType: 'daycare',
      recordLabel: '連絡帳',
      aiAssistantEnabled: false,
      daycareData: {
        training: {
          items: { sit: 'done' },
        },
      },
      groomingData: {
        selectedParts: [],
        partNotes: {},
        counseling: {
          style_request: '',
          caution_notes: '',
          condition_notes: '',
          consent_confirmed: false,
        },
      },
      hotelData: {
        check_in: '',
        check_out_scheduled: '',
        nights: 1,
        care_logs: [],
      },
      photos: {
        regular: [
          { id: 'p-1', url: 'https://example.com/1.jpg', uploadedAt: '2026-03-31T00:00:00.000Z' },
        ],
        concerns: [],
      },
      notes: {
        internal_notes: null,
        report_text: '十分な長さの報告文です。',
      },
      condition: null,
      healthCheck: null,
      navigate,
      showToast,
      confirm,
      finishSession,
      trackRecordEvent,
      sendAIFeedback: vi.fn().mockResolvedValue(undefined),
      analyzePhotoConcern: vi.fn().mockResolvedValue(undefined),
      onToneChange: vi.fn(),
      onGenerateReportSuggestion: vi.fn().mockResolvedValue(undefined),
      onRecordSaved,
    }))

    await act(async () => {
      await result.current.handleShare()
    })

    expect(recordsApiMock.create).toHaveBeenCalledWith(expect.objectContaining({
      status: 'saved',
    }))
    expect(recordsApiMock.share).toHaveBeenCalledWith(77)
    expect(showToast).not.toHaveBeenCalledWith(expect.stringContaining('共有しました'), 'success')
    expect(showToast).toHaveBeenCalledWith(
      'カルテ通知の送信に失敗したため、共有を完了できませんでした: LINE連携済みの飼い主ではありません',
      'error',
    )
    expect(navigate).toHaveBeenCalledWith('/records/77', { replace: true })
    expect(onRecordSaved).toHaveBeenCalled()
    expect(finishSession).not.toHaveBeenCalledWith('success', 'record_share_submit')
  })
})
