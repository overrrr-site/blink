import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRecordAISuggestions } from '../pages/records/hooks/useRecordAISuggestions'
import type { NotesData, PhotosData } from '../types/record'
import api from '../api/client'

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('useRecordAISuggestions', () => {
  it('generates report draft preview and applies it', async () => {
    const mockPost = api.post as unknown as ReturnType<typeof vi.fn>
    mockPost.mockResolvedValueOnce({
      data: {
        report: 'AI生成レポート',
        learning_data_id: 123,
      },
    })

    const { result } = renderHook(() => {
      const [notes, setNotes] = React.useState<NotesData>({ internal_notes: null, report_text: null })
      const [photos, setPhotos] = React.useState<PhotosData>({ regular: [], concerns: [] })
      const context = {
        recordType: 'daycare' as const,
        dogName: 'ポチ',
        daycareData: { activities: [] },
        groomingData: { selectedParts: [], partNotes: {} },
        hotelData: { check_in: '', check_out_scheduled: '', nights: 1 },
        photos,
        notes,
        condition: null,
        healthCheck: null,
      }

      const hook = useRecordAISuggestions({
        aiEnabled: true,
        context,
        setPhotos,
        setNotes,
      })

      return { ...hook, notes }
    })

    await waitFor(() => {
      expect(result.current.aiSuggestions['report-draft']?.message).toContain('AIで報告文を作成できます')
    })

    await act(async () => {
      await result.current.handleAISuggestionAction('report-draft')
    })

    expect(result.current.aiSuggestions['report-draft']?.preview).toBe('AI生成レポート')

    await act(async () => {
      await result.current.handleAISuggestionAction('report-draft', 'AI生成レポート')
    })

    expect(result.current.notes.report_text).toBe('AI生成レポート')
  })
})
