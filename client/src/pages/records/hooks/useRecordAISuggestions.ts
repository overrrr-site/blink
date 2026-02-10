import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import api from '../../../api/client'
import type { RecordType, DaycareData, GroomingData, HotelData, PhotosData, NotesData, ConditionData, HealthCheckData } from '../../../types/record'
import type { AISuggestionData, AISuggestionType, AIInputTraceItem } from '../../../types/ai'

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

const buildInitialSuggestions = (
  initialSuggestions?: Partial<Record<AISuggestionType, AISuggestionData | null>>
) => ({
  ...emptySuggestions,
  ...initialSuggestions,
})

function buildInputTrace(context: RecordAISuggestionContext): AIInputTraceItem[] {
  const items: AIInputTraceItem[] = [
    {
      key: 'photos',
      label: '写真',
      status: (context.photos.regular?.length || 0) > 0 ? 'present' : 'missing',
      count: context.photos.regular?.length || 0,
    },
    {
      key: 'condition',
      label: '体調・様子',
      status: context.condition?.overall ? 'present' : 'missing',
    },
    {
      key: 'health_check',
      label: '健康チェック',
      status: context.healthCheck && Object.values(context.healthCheck).some((v) => v !== undefined && v !== null && v !== '')
        ? 'present'
        : 'missing',
      count: context.healthCheck
        ? Object.values(context.healthCheck).filter((v) => v !== undefined && v !== null && v !== '').length
        : 0,
    },
    {
      key: 'internal_notes',
      label: '内部メモ',
      status: context.notes.internal_notes?.trim() ? 'present' : 'missing',
    },
  ]

  if (context.recordType === 'daycare') {
    items.push({
      key: 'daycare_activities',
      label: '活動記録',
      status: (context.daycareData.activities?.length || 0) > 0 ? 'present' : 'missing',
      count: context.daycareData.activities?.length || 0,
    })
  }

  if (context.recordType === 'grooming') {
    items.push({
      key: 'grooming_parts',
      label: '施術部位',
      status: (context.groomingData.selectedParts?.length || 0) > 0 ? 'present' : 'missing',
      count: context.groomingData.selectedParts?.length || 0,
    })
  }

  if (context.recordType === 'hotel') {
    items.push({
      key: 'hotel_stay',
      label: '宿泊情報',
      status: context.hotelData.check_in && context.hotelData.check_out_scheduled ? 'present' : 'missing',
      count: context.hotelData.nights || 0,
    })
  }

  return items
}

const INPUT_KEY_LABELS: Record<string, string> = {
  photos: '写真',
  condition: '体調・様子',
  health_check: '健康チェック',
  internal_notes: '内部メモ',
  daycare_activities: '活動記録',
  grooming_parts: '施術部位',
  hotel_stay: '宿泊情報',
}

function isSameInputTrace(a: AIInputTraceItem[] | undefined, b: AIInputTraceItem[]): boolean {
  if (!a || a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]
    const right = b[i]
    if (
      left.key !== right.key
      || left.label !== right.label
      || left.status !== right.status
      || (left.count ?? 0) !== (right.count ?? 0)
    ) {
      return false
    }
  }
  return true
}

const useLocalReportDraftSuggestion = (
  aiEnabled: boolean,
  reportText: string | null | undefined,
  inputTrace: AIInputTraceItem[],
  setAiSuggestions: Dispatch<SetStateAction<Record<AISuggestionType, AISuggestionData | null>>>,
  existingSuggestion?: AISuggestionData | null
) => {
  useEffect(() => {
    if (!aiEnabled) return
    const trimmed = reportText?.trim() || ''
    if (trimmed.length > 0) {
      if (existingSuggestion) {
        setAiSuggestions((prev) => ({ ...prev, 'report-draft': null }))
      }
      return
    }
    if (existingSuggestion?.dismissed) return
    if (existingSuggestion?.preview) return
    const missingCount = inputTrace.filter((item) => item.status === 'missing').length
    const nextMessage = missingCount > 0
      ? `AIで報告文を作成できます（未入力 ${missingCount} 項目）`
      : 'AIで報告文を作成できます'
    setAiSuggestions((prev) => {
      const current = prev['report-draft']
      const unchanged = Boolean(
        current
        && current.message === nextMessage
        && current.actionLabel === '作成する'
        && current.variant === 'default'
        && isSameInputTrace(current.input_trace, inputTrace)
      )
      if (unchanged) {
        return prev
      }
      return {
        ...prev,
        'report-draft': {
          type: 'report-draft',
          message: nextMessage,
          actionLabel: '作成する',
          variant: 'default',
          input_trace: inputTrace,
        },
      }
    })
  }, [aiEnabled, reportText, setAiSuggestions, existingSuggestion, inputTrace])
}

const useRemoteSuggestions = (
  aiEnabled: boolean,
  recordId: string | number | undefined,
  setAiSuggestions: Dispatch<SetStateAction<Record<AISuggestionType, AISuggestionData | null>>>
) => {
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
  }, [aiEnabled, recordId, setAiSuggestions])
}

const useAIFeedback = () => {
  const [aiLearningDataId, setAiLearningDataId] = useState<number | null>(null)
  const [aiGeneratedReport, setAiGeneratedReport] = useState<string | null>(null)
  const [aiFeedbackSent, setAiFeedbackSent] = useState(false)

  const registerGeneratedReport = useCallback((report: string | null, learningDataId?: number) => {
    if (learningDataId) {
      setAiLearningDataId(learningDataId)
    }
    if (report) {
      setAiGeneratedReport(report)
    }
    setAiFeedbackSent(false)
  }, [])

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

  return {
    sendAIFeedback,
    registerGeneratedReport,
  }
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
  const initialMap = useMemo(() => buildInitialSuggestions(initialSuggestions), [initialSuggestions])
  const reportInputTrace = useMemo(() => buildInputTrace(context), [context])

  const [aiSuggestions, setAiSuggestions] = useState<Record<AISuggestionType, AISuggestionData | null>>(initialMap)
  const [reportTone, setReportTone] = useState<'formal' | 'casual'>('formal')
  const { sendAIFeedback, registerGeneratedReport } = useAIFeedback()

  useEffect(() => {
    if (!aiEnabled) {
      setAiSuggestions({ ...emptySuggestions })
    }
  }, [aiEnabled])

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

  useLocalReportDraftSuggestion(
    aiEnabled,
    context.notes.report_text,
    reportInputTrace,
    setAiSuggestions,
    aiSuggestions['report-draft']
  )

  useRemoteSuggestions(aiEnabled, recordId, setAiSuggestions)

  const handleAISuggestionAction = useCallback(async (
    type: AISuggestionType,
    editedText?: string,
    options?: { regenerate?: boolean; tone?: 'formal' | 'casual' }
  ) => {
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
              url: payload.photoUrl!,
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
      // Two-step flow:
      // 1. If editedText is provided, apply it directly (user clicked "使う" or "この内容で適用")
      // 2. If editedText is NOT provided and no existing preview, call API to generate and store as preview
      if (editedText && !options?.regenerate) {
        // Apply step: user confirmed the text
        setNotes((prev) => ({ ...prev, report_text: editedText }))
      } else {
        // Generate step: call API and store result as preview
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
            tone: options?.tone || reportTone,
          })
          const report = response.data?.report
          const learningDataId = response.data?.learning_data_id as number | undefined
          const usedInputs = (response.data?.used_inputs as string[] | undefined) || []
          if (report) {
            // Store as preview in the suggestion instead of directly setting notes
            setAiSuggestions((prev) => ({
              ...prev,
              'report-draft': prev['report-draft']
                ? {
                    ...prev['report-draft']!,
                    preview: report,
                    message: '入力内容から報告文を作成しました',
                    actionLabel: '使う',
                    input_trace: reportInputTrace,
                    generated_from: usedInputs.map((key) => INPUT_KEY_LABELS[key] || key),
                  }
                : prev['report-draft'],
            }))
            registerGeneratedReport(report, learningDataId)
          }
        } catch {
          onReportDraftError?.()
          return
        }
        // Don't mark as applied yet - wait for user to confirm
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
  }, [aiSuggestions, context, onReportDraftError, registerGeneratedReport, reportInputTrace, reportTone, sendSuggestionFeedback, setNotes, setPhotos])

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
    reportInputTrace,
    setReportTone,
    handleAISuggestionAction,
    handleAISuggestionDismiss,
    analyzePhotoConcern,
    sendAIFeedback,
  }
}
