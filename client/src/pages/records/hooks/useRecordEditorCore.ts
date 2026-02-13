import { useCallback, useState } from 'react'

export interface RecordEditorValidationResult {
  ok: boolean
  errors: string[]
}

interface UseRecordEditorCoreArgs {
  validate: (mode: 'save' | 'share') => RecordEditorValidationResult
  onValidationError: (message: string) => void
  onSave: () => Promise<void>
  onShare: () => Promise<void>
  onSaveError: () => void
  onShareError: () => void
  confirmShare?: () => Promise<boolean>
  validateShareBeforeConfirm?: boolean
  onToneChange?: (tone: 'formal' | 'casual') => void
  onGenerateReport?: (tone: 'formal' | 'casual') => Promise<void>
  initialTone?: 'formal' | 'casual'
}

const toErrorMessage = (validation: RecordEditorValidationResult): string =>
  validation.errors[0] || '入力内容を確認してください'

export const useRecordEditorCore = ({
  validate,
  onValidationError,
  onSave,
  onShare,
  onSaveError,
  onShareError,
  confirmShare,
  validateShareBeforeConfirm = true,
  onToneChange,
  onGenerateReport,
  initialTone = 'formal',
}: UseRecordEditorCoreArgs) => {
  const [saving, setSaving] = useState(false)
  const [reportTone, setReportToneState] = useState<'formal' | 'casual'>(initialTone)

  const setReportTone = useCallback((tone: 'formal' | 'casual') => {
    setReportToneState(tone)
    onToneChange?.(tone)
  }, [onToneChange])

  const executeWithSaving = useCallback(async (
    action: () => Promise<void>,
    onError: () => void
  ) => {
    setSaving(true)
    try {
      await action()
    } catch {
      onError()
    } finally {
      setSaving(false)
    }
  }, [])

  const runValidatedAction = useCallback(async (
    mode: 'save' | 'share',
    action: () => Promise<void>,
    onError: () => void
  ) => {
    const validation = validate(mode)
    if (!validation.ok) {
      onValidationError(toErrorMessage(validation))
      return
    }
    await executeWithSaving(action, onError)
  }, [executeWithSaving, onValidationError, validate])

  const handleSave = useCallback(async () => {
    await runValidatedAction('save', onSave, onSaveError)
  }, [onSave, onSaveError, runValidatedAction])

  const handleShare = useCallback(async () => {
    if (confirmShare) {
      if (!validateShareBeforeConfirm) {
        const ok = await confirmShare()
        if (!ok) return
      }
    }
    if (validateShareBeforeConfirm) {
      const validation = validate('share')
      if (!validation.ok) {
        onValidationError(toErrorMessage(validation))
        return
      }
    }
    if (confirmShare && validateShareBeforeConfirm) {
      const ok = await confirmShare()
      if (!ok) return
    }
    if (!validateShareBeforeConfirm) {
      const validation = validate('share')
      if (!validation.ok) {
        onValidationError(toErrorMessage(validation))
        return
      }
    }
    await executeWithSaving(onShare, onShareError)
  }, [confirmShare, executeWithSaving, onShare, onShareError, onValidationError, validate, validateShareBeforeConfirm])

  const handleGenerateReport = useCallback(async () => {
    if (!onGenerateReport) return
    await onGenerateReport(reportTone)
  }, [onGenerateReport, reportTone])

  const handleToneChangeAndGenerate = useCallback(async (tone: 'formal' | 'casual') => {
    setReportTone(tone)
    if (!onGenerateReport) return
    await onGenerateReport(tone)
  }, [onGenerateReport, setReportTone])

  return {
    saving,
    reportTone,
    setReportTone,
    handleSave,
    handleShare,
    handleGenerateReport,
    handleToneChangeAndGenerate,
  }
}
