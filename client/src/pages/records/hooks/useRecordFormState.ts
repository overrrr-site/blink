import { useState } from 'react'
import type {
  DaycareData,
  GroomingData,
  HotelData,
  PhotosData,
  NotesData,
  ConditionData,
  HealthCheckData,
} from '../../../types/record'

export interface RecordFormState {
  daycareData: DaycareData
  groomingData: GroomingData
  hotelData: HotelData
  photos: PhotosData
  notes: NotesData
  condition: ConditionData | null
  healthCheck: HealthCheckData | null
}

export const createInitialRecordFormState = (overrides: Partial<RecordFormState> = {}): RecordFormState => ({
  daycareData: overrides.daycareData ?? { activities: [] },
  groomingData: overrides.groomingData ?? { selectedParts: [], partNotes: {} },
  hotelData: overrides.hotelData ?? { check_in: '', check_out_scheduled: '', nights: 1 },
  photos: overrides.photos ?? { regular: [], concerns: [] },
  notes: overrides.notes ?? { internal_notes: null, report_text: null },
  condition: overrides.condition ?? null,
  healthCheck: overrides.healthCheck ?? null,
})

export const useRecordFormState = (overrides: Partial<RecordFormState> = {}) => {
  const initial = createInitialRecordFormState(overrides)
  const [daycareData, setDaycareData] = useState<DaycareData>(initial.daycareData)
  const [groomingData, setGroomingData] = useState<GroomingData>(initial.groomingData)
  const [hotelData, setHotelData] = useState<HotelData>(initial.hotelData)
  const [photos, setPhotos] = useState<PhotosData>(initial.photos)
  const [notes, setNotes] = useState<NotesData>(initial.notes)
  const [condition, setCondition] = useState<ConditionData | null>(initial.condition)
  const [healthCheck, setHealthCheck] = useState<HealthCheckData | null>(initial.healthCheck)

  return {
    daycareData,
    setDaycareData,
    groomingData,
    setGroomingData,
    hotelData,
    setHotelData,
    photos,
    setPhotos,
    notes,
    setNotes,
    condition,
    setCondition,
    healthCheck,
    setHealthCheck,
  }
}
