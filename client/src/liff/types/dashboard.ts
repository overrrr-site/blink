import type { RecordType } from '../../types/record'

export interface DashboardReservationSummary {
  id: number
  reservation_date: string
  reservation_time: string
  status: string
  checked_in_at: string | null
  checked_out_at: string | null
  dog_name: string
  dog_photo: string | null
  has_pre_visit_input: boolean
}

export interface DashboardRecordSummary {
  id: number
  record_date: string
  dog_name: string
  dog_photo: string | null
  excerpt: string | null
  photo_count: number
}

export interface DashboardAnnouncementSummaryItem {
  id: number
  title: string
  published_at: string
  is_important: boolean
}

export interface DashboardAnnouncementSummary {
  total: number
  unread: number
  latest: DashboardAnnouncementSummaryItem | null
}

export interface DashboardSummary {
  service_type: RecordType
  next_reservation: DashboardReservationSummary | null
  latest_record: DashboardRecordSummary | null
  announcements: DashboardAnnouncementSummary
}
