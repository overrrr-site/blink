import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { recordsApi } from '../../../api/records'
import type {
  ConditionData,
  DaycareData,
  GroomingData,
  HealthCheckData,
  HotelData,
  RecordType,
} from '../../../types/record'

type ShowToast = (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void

interface UseCopyPreviousRecordArgs {
  selectedDogId: number | null
  recordType: RecordType
  recordLabel: string
  showToast: ShowToast
  setDaycareData: Dispatch<SetStateAction<DaycareData>>
  setGroomingData: Dispatch<SetStateAction<GroomingData>>
  setHotelData: Dispatch<SetStateAction<HotelData>>
  setCondition: Dispatch<SetStateAction<ConditionData | null>>
  setHealthCheck: Dispatch<SetStateAction<HealthCheckData | null>>
}

export function useCopyPreviousRecord({
  selectedDogId,
  recordType,
  recordLabel,
  showToast,
  setDaycareData,
  setGroomingData,
  setHotelData,
  setCondition,
  setHealthCheck,
}: UseCopyPreviousRecordArgs) {
  const [copyLoading, setCopyLoading] = useState(false)

  const handleCopyPrevious = useCallback(async () => {
    if (!selectedDogId) return

    setCopyLoading(true)
    try {
      const res = await recordsApi.getLatest(selectedDogId, recordType)
      const prev = res.data
      if (prev.daycare_data) setDaycareData(prev.daycare_data)
      if (prev.grooming_data) setGroomingData(prev.grooming_data)
      if (prev.hotel_data) setHotelData(prev.hotel_data)
      if (prev.condition) setCondition(prev.condition)
      if (prev.health_check) setHealthCheck(prev.health_check)
      showToast('前回のデータをコピーしました', 'success')
    } catch {
      showToast(`前回の${recordLabel}がありません`, 'info')
    } finally {
      setCopyLoading(false)
    }
  }, [
    recordLabel,
    recordType,
    selectedDogId,
    setCondition,
    setDaycareData,
    setGroomingData,
    setHealthCheck,
    setHotelData,
    showToast,
  ])

  return {
    copyLoading,
    handleCopyPrevious,
  }
}
