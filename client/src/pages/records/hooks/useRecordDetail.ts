import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import useSWR from 'swr'
import type { PaginatedResponse } from '../../../types/api'
import type {
  ConditionData,
  DaycareData,
  GroomingData,
  HealthCheckData,
  HotelData,
  NotesData,
  PhotosData,
  RecordItem,
} from '../../../types/record'
import { fetcher } from '../../../lib/swr'
import { normalizePhotosData } from '../../../utils/recordPhotos'

interface UseRecordDetailArgs {
  recordId?: string
  setDaycareData: (value: DaycareData) => void
  setGroomingData: (value: GroomingData) => void
  setHotelData: (value: HotelData) => void
  setPhotos: (value: PhotosData) => void
  setNotes: (value: NotesData) => void
  setCondition: (value: ConditionData | null) => void
  setHealthCheck: (value: HealthCheckData | null) => void
  setCollapsed?: Dispatch<SetStateAction<{ condition: boolean; health: boolean }>>
}

export function useRecordDetail({
  recordId,
  setDaycareData,
  setGroomingData,
  setHotelData,
  setPhotos,
  setNotes,
  setCondition,
  setHealthCheck,
  setCollapsed,
}: UseRecordDetailArgs) {
  const { data: record, isLoading, mutate } = useSWR<RecordItem>(
    recordId ? `/records/${recordId}` : null,
    fetcher
  )

  const { data: weightRecords } = useSWR<PaginatedResponse<RecordItem>>(
    record?.dog_id && record.record_type === 'grooming'
      ? `/records?dog_id=${record.dog_id}&record_type=grooming&limit=6`
      : null,
    fetcher,
  )

  const weightHistory = useMemo(() => {
    if (!weightRecords?.data) return []
    return weightRecords.data
      .filter((item) => item.health_check?.weight !== undefined && item.health_check?.weight !== null)
      .map((item) => {
        const d = new Date(item.record_date)
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          weight: Number(item.health_check?.weight),
        }
      })
      .reverse()
  }, [weightRecords?.data])

  useEffect(() => {
    if (!record) return
    if (record.daycare_data) setDaycareData(record.daycare_data)
    if (record.grooming_data) {
      setGroomingData({
        ...record.grooming_data,
        counseling: {
          style_request: record.grooming_data.counseling?.style_request || '',
          caution_notes: record.grooming_data.counseling?.caution_notes || '',
          condition_notes: record.grooming_data.counseling?.condition_notes || '',
          consent_confirmed: record.grooming_data.counseling?.consent_confirmed || false,
        },
      })
    }
    if (record.hotel_data) {
      setHotelData({
        ...record.hotel_data,
        care_logs: Array.isArray(record.hotel_data.care_logs) ? record.hotel_data.care_logs : [],
      })
    }
    setPhotos(normalizePhotosData(record.photos || { regular: [], concerns: [] }))
    if (record.notes) setNotes(record.notes)
    if (record.condition) {
      setCondition(record.condition)
      setCollapsed?.((s) => ({ ...s, condition: false }))
    }
    if (record.health_check) {
      setHealthCheck(record.health_check)
      setCollapsed?.((s) => ({ ...s, health: false }))
    }
  }, [
    record,
    setCondition,
    setDaycareData,
    setGroomingData,
    setHealthCheck,
    setHotelData,
    setNotes,
    setPhotos,
    setCollapsed,
  ])

  return {
    record,
    isLoading,
    mutate,
    weightHistory,
  }
}
