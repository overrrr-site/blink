import { render, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecordAISuggestions } from '../useRecordAISuggestions'
import api from '../../../../api/client'

vi.mock('../../../../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

const baseContext = {
  recordType: 'grooming' as const,
  dogName: 'Pochi',
  daycareData: { activities: [] },
  groomingData: { selectedParts: [], partNotes: {} },
  hotelData: { check_in: '', check_out_scheduled: '', nights: 1 },
  photos: { regular: [], concerns: [] },
  notes: { internal_notes: null, report_text: null },
  condition: null,
  healthCheck: null,
}

describe('useRecordAISuggestions', () => {
  const postMock = api.post as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    postMock.mockReset()
    postMock.mockImplementation((url: string) => {
      if (url === '/ai/generate-report') {
        return Promise.resolve({
          data: {
            report: 'AI report',
            learning_data_id: 123,
          },
        })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it('sends feedback only once when learning id is available', async () => {
    const setPhotos = vi.fn()
    const setNotes = vi.fn()
    let handlers:
      | ReturnType<typeof useRecordAISuggestions>
      | null = null

    function HookHarness() {
      handlers = useRecordAISuggestions({
        aiEnabled: true,
        context: baseContext,
        setPhotos,
        setNotes,
        onReportDraftError: vi.fn(),
      })
      return null
    }

    render(<HookHarness />)

    await act(async () => {
      await handlers!.handleAISuggestionAction('report-draft')
    })

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/ai/generate-report', expect.any(Object))
    })

    await act(async () => {
      await handlers!.sendAIFeedback('final text')
      await handlers!.sendAIFeedback('final text')
    })

    const feedbackCalls = postMock.mock.calls.filter(([url]) => url === '/ai/feedback')
    expect(feedbackCalls).toHaveLength(1)
  })
})
