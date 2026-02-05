export type RecordType = 'grooming' | 'daycare' | 'hotel'
export type RecordStatus = 'draft' | 'saved' | 'shared'

export interface GroomingData {
  selectedParts: string[]
  partNotes: Record<string, string>
}

export interface DaycareData {
  activities: string[]
  training?: {
    items: Record<string, string>
  }
  meal?: {
    morning?: string
    afternoon?: string
  }
  toilet?: {
    morning?: { urination: boolean; defecation: boolean }
    afternoon?: { urination: boolean; defecation: boolean }
  }
}

export interface HotelData {
  check_in: string
  check_out_scheduled: string
  check_out_actual?: string
  nights: number
  special_care?: string
  daily_notes?: Record<string, string>
}

export interface PhotosData {
  regular: Photo[]
  concerns: ConcernPhoto[]
}

export interface Photo {
  id: string
  url: string
  uploadedAt: string
}

export interface ConcernPhoto extends Photo {
  label?: string
  annotation?: { x: number; y: number }
}

export interface NotesData {
  internal_notes: string | null
  report_text: string | null
}

export type ConditionLevel = 'excellent' | 'good' | 'normal' | 'tired' | 'observe'

export interface ConditionData {
  overall: ConditionLevel
}

export interface HealthCheckData {
  weight?: number
  ears?: string
  nails?: string
  skin?: string
  teeth?: string
}

export interface RecordItem {
  id: number
  store_id: number
  dog_id: number
  reservation_id: number | null
  staff_id: number | null
  record_type: RecordType
  record_date: string
  grooming_data: GroomingData | null
  daycare_data: DaycareData | null
  hotel_data: HotelData | null
  photos: PhotosData | null
  notes: NotesData | null
  condition: ConditionData | null
  health_check: HealthCheckData | null
  ai_generated_text: string | null
  ai_suggestions: unknown | null
  status: RecordStatus
  shared_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // JOIN fields
  dog_name?: string
  dog_photo?: string | null
  dog_breed?: string
  dog_birth_date?: string
  dog_gender?: string
  owner_name?: string
  owner_id?: number
  staff_name?: string | null
}

export interface RecordFormData {
  dog_id: number | null
  reservation_id?: number | null
  record_type: RecordType
  record_date: string
  grooming_data?: GroomingData | null
  daycare_data?: DaycareData | null
  hotel_data?: HotelData | null
  photos?: PhotosData | null
  notes?: NotesData | null
  condition?: ConditionData | null
  health_check?: HealthCheckData | null
  ai_generated_text?: string | null
  ai_suggestions?: unknown | null
  status?: RecordStatus
}
