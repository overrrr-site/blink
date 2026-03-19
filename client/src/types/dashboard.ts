import type { ReservationCardData } from '../components/ReservationCard'

export type Reservation = ReservationCardData

export interface IncompleteRecord {
  reservation_id: number
  reservation_date: string
  record_date: string
  reservation_time: string
  dog_id: number
  dog_name: string
  dog_photo?: string
  owner_name: string
  record_id: number | null
  comment: string | null
}

export interface DashboardAlert {
  dog_id: number
  dog_name: string
  dog_gender?: string
  owner_name: string
  alert_type: 'mixed_vaccine_expired' | 'rabies_vaccine_expiring'
  mixed_vaccine_date?: string
}

export interface InspectionRecord {
  id: number
  store_id: number
  inspection_date: string
  [key: string]: unknown
}

export interface DashboardData {
  todayReservations: Reservation[]
  incompleteRecords: IncompleteRecord[]
  alerts: DashboardAlert[]
  todayInspectionRecord: InspectionRecord | null
  capacity?: number
  announcementStats?: {
    published: number
    draft: number
  }
}
