import type {
  RecordFormData,
  RecordType,
  DaycareData,
  GroomingData,
  HotelData,
  PhotosData,
  NotesData,
  ConditionData,
  HealthCheckData,
} from '../../../types/record'
import { normalizePhotosData } from '../../../utils/recordPhotos'
import { validateRecord } from '../../../utils/recordValidation'

export interface RecordFormPayloadInput {
  recordType: RecordType
  daycareData: DaycareData
  groomingData: GroomingData
  hotelData: HotelData
  photos: PhotosData
  notes: NotesData
  condition: ConditionData | null
  healthCheck: HealthCheckData | null
}

const buildRecordBasePayload = (
  input: RecordFormPayloadInput,
  options: { normalizePhotos?: boolean } = {}
): Partial<RecordFormData> => ({
  daycare_data: input.recordType === 'daycare' ? input.daycareData : undefined,
  grooming_data: input.recordType === 'grooming' ? input.groomingData : undefined,
  hotel_data: input.recordType === 'hotel' ? input.hotelData : undefined,
  photos: options.normalizePhotos ? normalizePhotosData(input.photos) : input.photos,
  notes: input.notes,
  condition: input.condition,
  health_check: input.healthCheck,
})

export const buildCreateRecordPayload = (
  input: RecordFormPayloadInput & {
    dogId: number
    reservationId?: string | number | null
    status: 'saved' | 'shared'
    recordDate?: string
  }
): RecordFormData => ({
  dog_id: input.dogId,
  reservation_id: input.reservationId !== undefined && input.reservationId !== null
    ? Number(input.reservationId)
    : null,
  record_type: input.recordType,
  record_date: input.recordDate ?? new Date().toISOString().split('T')[0],
  status: input.status,
  ...buildRecordBasePayload(input, { normalizePhotos: true }),
})

export const buildUpdateRecordPayload = (
  input: RecordFormPayloadInput & { status?: 'saved' | 'shared' }
): Partial<RecordFormData> => ({
  ...buildRecordBasePayload(input),
  ...(input.status ? { status: input.status } : {}),
})

export const validateRecordForm = (
  input: RecordFormPayloadInput,
  mode: 'save' | 'share'
) => validateRecord({
  recordType: input.recordType,
  groomingData: input.groomingData,
  daycareData: input.daycareData,
  hotelData: input.hotelData,
  photos: input.photos,
  notes: input.notes,
  condition: input.condition,
  healthCheck: input.healthCheck,
}, mode)
