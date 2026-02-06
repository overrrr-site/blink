import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import api from '../../../api/client'
import type { RecordType, DaycareData, GroomingData, HotelData, PhotosData, NotesData, ConditionData, HealthCheckData } from '../../../types/record'
import type { AISuggestionData, AISuggestionType } from '../../../types/ai'

export interface RecordAISuggestionContext {
  recordType: RecordType
  dogName?: string
  daycareData: DaycareData
  groomingData: GroomingData
  hotelData: HotelData
  photos: PhotosData
  notes: NotesData
  condition: ConditionData | null
  healthCheck: HealthCheckData | null
}

const emptySuggestions: Record<AISuggestionType, AISuggestionData | null> = {
  'photo-concern': null,
  'health-history': null,
  'report-draft': null,
  'weight-change': null,
  'long-absence': null,
  'birthday': null,
  'follow-up': null,
  'training-progress': null,
  'long-stay': null,
}

interface UseRecordAISuggestionsArgs {
  aiEnabled: boolean
  context: RecordAISuggestionContext
  setPhotos: Dispatch<SetStateAction<PhotosData>>
  setNotes: Dispatch<SetStateAction<NotesData>>
  initialSuggestions?: Partial<Record<AISuggestionType, AISuggestionData | null>>
  recordId?: string | number
  onReportDraftError?: () => void
}

export const useRecordAISuggestions = ({
  aiEnabled,
  context,
  setPhotos,
  setNotes,
  initialSuggestions,
  recordId,
  onReportDraftError,
}: UseRecordAISuggestionsArgs) => {
  const initialMap = useMemo(() => ({
    ...emptySuggestions,
    ...initialSuggestions,
  }), [initialSuggestions])

  const [aiSuggestions, setAiSuggestions] = useState<Record<AISuggestionType, AISuggestionData | null>>(initialMap)
  const [aiLearningDataId, setAiLearningDataId] = useState<number | null>(null)
  const [aiGeneratedReport, setAiGeneratedReport] = useState<string | null>(null)
  const [aiFeedbackSent, setAiFeedbackSent] = useState(false)

  useEffect(() => {
    if (!aiEnabled) {
      setAiSuggestions({ ...emptySuggestions })
    }
  }, [aiEnabled])

  const sendAIFeedback = useCallback(async (finalText: string | null | undefined) => {
    if (!aiLearningDataId || aiFeedbackSent) return
    const trimmed = (finalText || '').trim()
    const wasUsed = trimmed.length > 0
    const wasEdited = aiGeneratedReport ? trimmed !== aiGeneratedReport.trim() : false
    try {
      await api.post('/ai/feedback', {
        learning_data_id: aiLearningDataId,
        was_used: wasUsed,
        was_edited: wasEdited,
        final_text: wasUsed ? trimmed : null,
      })
      setAiFeedbackSent(true)
    } catch {
      // ignore feedback errors
    }
  }, [aiFeedbackSent, aiGeneratedReport, aiLearningDataId])

  const sendSuggestionFeedback = useCallback(async (type: AISuggestionType, wasApplied: boolean) => {
    try {
      await api.post('/ai/suggestion-feedback', {
        suggestion_type: type,
        was_applied: wasApplied,
        record_type: context.recordType,
      })
    } catch {
      // ignore feedback errors
    }
  }, [context.recordType])

  useEffect(() => {
    if (!aiEnabled) return
    if (context.notes.report_text && context.notes.report_text.trim().length > 0) {
      if (aiSuggestions['report-draft']) {
        setAiSuggestions((prev) => ({ ...prev, 'report-draft': null }))
      }
      return
    }
    if (aiSuggestions['report-draft']?.dismissed) return
    setAiSuggestions((prev) => ({
      ...prev,
      'report-draft': {
        type: 'report-draft',
        message: '入力内容から報告文を作成しました',
        actionLabel: '下書きを使用',
        variant: 'default',
        preview: 'AIで報告文を生成できます',
      },
    }))
  }, [aiEnabled, context.notes.report_text])

  useEffect(() => {
    if (!aiEnabled || !recordId) return
    const fetchSuggestions = async () => {
      try {
        const response = await api.get(`/ai/suggestions/${recordId}`)
        const suggestions = response.data?.suggestions as AISuggestionData[] | undefined
        if (!suggestions || suggestions.length === 0) return
        setAiSuggestions((prev) => {
          const next = { ...prev }
          suggestions.forEach((suggestion) => {
            next[suggestion.type] = suggestion
          })
          return next
        })
      } catch {
        // ignore AI errors
      }
    }
    fetchSuggestions()
  }, [aiEnabled, recordId, context.recordType, context.healthCheck])

  const handleAISuggestionAction = useCallback(async (type: AISuggestionType) => {
    if (type === 'photo-concern') {
      const suggestion = aiSuggestions['photo-concern']
      const payload = suggestion?.payload as { photoUrl?: string; label?: string; annotation?: { x: number; y: number } } | undefined
      if (payload?.photoUrl) {
        setPhotos((prev) => ({
          ...prev,
          concerns: [
            ...(prev.concerns || []),
            {
              id: `ai-${Date.now()}`,
              url: payload.photoUrl,
              uploadedAt: new Date().toISOString(),
              label: payload.label || '気になる箇所',
              annotation: payload.annotation,
            },
          ],
        }))
      }
    }

    if (type === 'health-history') {
      setNotes((prev) => ({
        ...prev,
        report_text: `${prev.report_text || ''}\n\n耳の汚れが2回連続しています。継続的なケアをおすすめします。`.trim(),
      }))
    }

    if (type === 'report-draft') {
      if (!context.dogName) return
      try {
        const response = await api.post('/ai/generate-report', {
          record_type: context.recordType,
          dog_name: context.dogName,
          grooming_data: context.recordType === 'grooming' ? context.groomingData : undefined,
          daycare_data: context.recordType === 'daycare' ? context.daycareData : undefined,
          hotel_data: context.recordType === 'hotel' ? context.hotelData : undefined,
          condition: context.condition,
          health_check: context.healthCheck,
          photos: context.photos,
          notes: context.notes,
        })
        const report = response.data?.report
        const learningDataId = response.data?.learning_data_id as number | undefined
        if (report) {
          setNotes((prev) => ({ ...prev, report_text: report }))
          if (learningDataId) {
            setAiLearningDataId(learningDataId)
            setAiGeneratedReport(report)
            setAiFeedbackSent(false)
          }
        }
      } catch {
        onReportDraftError?.()
        return
      }
    }

    await sendSuggestionFeedback(type, true)

    setAiSuggestions((prev) => ({
      ...prev,
      [type]: prev[type] ? { ...prev[type]!, applied: true } : prev[type],
    }))

    setTimeout(() => {
      setAiSuggestions((prev) => ({
        ...prev,
        [type]: prev[type] ? { ...prev[type]!, dismissed: true } : prev[type],
      }))
    }, 2000)
  }, [aiSuggestions, context, onReportDraftError, sendSuggestionFeedback, setNotes, setPhotos])

  const handleAISuggestionDismiss = useCallback((type: AISuggestionType) => {
    setAiSuggestions((prev) => ({
      ...prev,
      [type]: prev[type] ? { ...prev[type]!, dismissed: true } : prev[type],
    }))
    sendSuggestionFeedback(type, false)
  }, [sendSuggestionFeedback])

  const analyzePhotoConcern = useCallback(async (photoUrl: string) => {
    if (!aiEnabled || context.recordType !== 'grooming') return
    try {
      const response = await api.post('/ai/analyze-photo', {
        mode: 'record',
        record_type: context.recordType,
        photo: photoUrl,
      })
      const suggestion = response.data?.suggestion as AISuggestionData | undefined
      if (suggestion) {
        setAiSuggestions((prev) => ({ ...prev, 'photo-concern': suggestion }))
      }
    } catch {
      // ignore AI errors
    }
  }, [aiEnabled, context.recordType])

  return {
    aiSuggestions,
    handleAISuggestionAction,
    handleAISuggestionDismiss,
    analyzePhotoConcern,
    sendAIFeedback,
  }
}
