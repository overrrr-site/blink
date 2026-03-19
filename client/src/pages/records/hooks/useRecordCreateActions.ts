import { useCallback } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { recordsApi } from '../../../api/records'
import type {
  ConditionData,
  DaycareData,
  GroomingData,
  HealthCheckData,
  HotelData,
  NotesData,
  PhotosData,
  RecordType,
} from '../../../types/record'
import { useRecordEditorCore } from './useRecordEditorCore'
import { buildCreateRecordPayload, validateRecordForm } from '../utils/recordForm'
import type { RecordCreateEventName, RecordCreateSessionResult } from './useRecordCreateAnalytics'

type ShowToast = (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
type ConfirmDialogVariant = 'default' | 'destructive'
type ReportTone = 'formal' | 'casual'

interface ConfirmOptions {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmDialogVariant
}

interface UseRecordCreateActionsArgs {
  selectedDogId: number | null
  reservationId?: string
  recordType: RecordType
  recordLabel: string
  aiAssistantEnabled: boolean
  daycareData: DaycareData
  groomingData: GroomingData
  hotelData: HotelData
  photos: PhotosData
  notes: NotesData
  condition: ConditionData | null
  healthCheck: HealthCheckData | null
  navigate: NavigateFunction
  showToast: ShowToast
  confirm: (options?: ConfirmOptions) => Promise<boolean>
  finishSession: (result: RecordCreateSessionResult, step?: string) => void
  trackRecordEvent: (
    eventName: RecordCreateEventName,
    step: string,
    meta?: Record<string, string | number | boolean>,
  ) => void
  sendAIFeedback: (finalText: string | null | undefined) => Promise<void>
  analyzePhotoConcern: (photoUrl: string) => Promise<void>
  onToneChange: (tone: ReportTone) => void
  onGenerateReportSuggestion: (tone: ReportTone) => Promise<void>
  onRecordSaved: () => void
}

export function useRecordCreateActions({
  selectedDogId,
  reservationId,
  recordType,
  recordLabel,
  aiAssistantEnabled,
  daycareData,
  groomingData,
  hotelData,
  photos,
  notes,
  condition,
  healthCheck,
  navigate,
  showToast,
  confirm,
  finishSession,
  trackRecordEvent,
  sendAIFeedback,
  analyzePhotoConcern,
  onToneChange,
  onGenerateReportSuggestion,
  onRecordSaved,
}: UseRecordCreateActionsArgs) {
  const validateEditor = useCallback((mode: 'save' | 'share') => {
    if (!selectedDogId) {
      return { ok: false, errors: ['ワンちゃんを選択してください'] }
    }

    return validateRecordForm({
      recordType,
      groomingData,
      daycareData,
      hotelData,
      photos,
      notes,
      condition,
      healthCheck,
    }, mode)
  }, [selectedDogId, recordType, groomingData, daycareData, hotelData, photos, notes, condition, healthCheck])

  const createRecord = useCallback(async (shareAfter: boolean) => {
    if (!selectedDogId) return

    const formData = buildCreateRecordPayload({
      dogId: selectedDogId,
      reservationId,
      recordType,
      status: shareAfter ? 'shared' : 'saved',
      daycareData,
      groomingData,
      hotelData,
      photos,
      notes,
      condition,
      healthCheck,
    })

    const res = await recordsApi.create(formData)
    const recordId = res.data.id

    trackRecordEvent('submit_success', shareAfter ? 'record_share_submit' : 'record_save_submit', {
      share_after: shareAfter,
    })
    finishSession('success', shareAfter ? 'record_share_submit' : 'record_save_submit')

    if (shareAfter) {
      await recordsApi.share(recordId)
      showToast(`${recordLabel}を共有しました`, 'success')
    } else {
      showToast(`${recordLabel}を保存しました`, 'success')
    }

    onRecordSaved()
    await sendAIFeedback(notes.report_text)
    navigate(`/records/${recordId}`, { replace: true })
  }, [
    condition,
    daycareData,
    finishSession,
    groomingData,
    healthCheck,
    hotelData,
    navigate,
    notes,
    onRecordSaved,
    photos,
    recordLabel,
    recordType,
    reservationId,
    selectedDogId,
    sendAIFeedback,
    showToast,
    trackRecordEvent,
  ])

  const handlePhotoAdded = useCallback(async (photoUrl: string, type: 'regular' | 'concern') => {
    if (!aiAssistantEnabled || recordType !== 'grooming' || type !== 'regular') return
    await analyzePhotoConcern(photoUrl)
  }, [aiAssistantEnabled, analyzePhotoConcern, recordType])

  const {
    saving,
    reportTone: selectedReportTone,
    setReportTone: setSelectedReportTone,
    handleSave,
    handleShare,
    handleGenerateReport,
  } = useRecordEditorCore({
    validate: validateEditor,
    onValidationError: (message) => {
      trackRecordEvent('form_error', 'record_validation_error')
      showToast(message, 'error')
    },
    onSave: () => {
      trackRecordEvent('cta_click', 'record_save_click', { mode: 'save' })
      return createRecord(false)
    },
    onShare: () => {
      trackRecordEvent('cta_click', 'record_share_click', { mode: 'share' })
      return createRecord(true)
    },
    onSaveError: () => {
      trackRecordEvent('submit_fail', 'record_save_submit', { mode: 'save' })
      showToast('保存に失敗しました', 'error')
    },
    onShareError: () => {
      trackRecordEvent('submit_fail', 'record_share_submit', { mode: 'share' })
      showToast('保存に失敗しました', 'error')
    },
    confirmShare: () => confirm({
      title: '送信確認',
      message: '飼い主に送信しますか？',
      confirmLabel: '送信',
      cancelLabel: 'キャンセル',
      variant: 'default',
    }),
    validateShareBeforeConfirm: false,
    onToneChange,
    onGenerateReport: onGenerateReportSuggestion,
  })

  return {
    saving,
    selectedReportTone,
    setSelectedReportTone,
    handleSave,
    handleShare,
    handleGenerateReport,
    handlePhotoAdded,
  }
}
