import type { ConditionData, DaycareData, GroomingData, HealthCheckData, HotelData, NotesData, PhotosData, RecordType } from '@/types/record'

interface ValidationInput {
  recordType: RecordType
  groomingData?: GroomingData | null
  daycareData?: DaycareData | null
  hotelData?: HotelData | null
  photos?: PhotosData | null
  notes?: NotesData | null
  condition?: ConditionData | null
  healthCheck?: HealthCheckData | null
}

interface ValidationResult {
  ok: boolean
  errors: string[]
}

export const validateRecord = (input: ValidationInput, mode: 'save' | 'share'): ValidationResult => {
  const errors: string[] = []
  const reportText = input.notes?.report_text?.trim() || ''
  const photoCount = input.photos?.regular?.length || 0

  if (input.recordType === 'grooming') {
    const parts = input.groomingData?.selectedParts || []
    if (parts.length === 0) {
      errors.push('カット部位を1つ以上選択してください')
    }

    if (mode === 'share') {
      const counseling = input.groomingData?.counseling
      if (!counseling?.style_request?.trim()) {
        errors.push('希望スタイルを入力してください')
      }
      if (!counseling?.condition_notes?.trim()) {
        errors.push('当日の体調確認を入力してください')
      }
      if (!counseling?.consent_confirmed) {
        errors.push('カウンセリング確認チェックをオンにしてください')
      }
    }
  }

  if (input.recordType === 'daycare') {
    const trainingItems = input.daycareData?.training?.items || {}
    const hasTraining = Object.values(trainingItems).some((v) => v && v !== '')
    if (!hasTraining) {
      errors.push('トレーニング項目を1つ以上記録してください')
    }
  }

  if (input.recordType === 'hotel') {
    if (!input.hotelData?.check_in || !input.hotelData?.check_out_scheduled) {
      errors.push('チェックインとチェックアウト予定を入力してください')
    }
  }

  if (photoCount === 0) {
    errors.push('写真を1枚以上追加してください')
  }

  if (!reportText) {
    errors.push('報告文を入力してください')
  }

  if (mode === 'share' && reportText.length < 10) {
    errors.push('報告文を10文字以上入力してください')
  }

  return { ok: errors.length === 0, errors }
}
