import { getDashboardStatusLabels } from '../../domain/businessTypeConfig'
import type { RecordType } from '../../types/record'

export type ReservationCardStatus = '予定' | '登園済' | '降園済' | 'キャンセル'
export type DashboardDisplayStatus = '来園待ち' | '在園中' | '帰宅済'

interface ReservationStatusSource {
  status: ReservationCardStatus
}

interface ReservationPreVisitSource {
  daycare_data?: unknown | null
  grooming_data?: unknown | null
  hotel_data?: unknown | null
}

export function getDisplayStatus(reservation: ReservationStatusSource): DashboardDisplayStatus {
  if (reservation.status === '降園済') return '帰宅済'
  if (reservation.status === '登園済') return '在園中'
  return '来園待ち'
}

export function getReservationStatusLabel(
  status: DashboardDisplayStatus,
  businessType: RecordType | null
): string {
  const labels = getDashboardStatusLabels(businessType)
  switch (status) {
    case '来園待ち':
      return labels.waiting
    case '在園中':
      return labels.active
    case '帰宅済':
      return labels.done
  }
}

export function hasPreVisitInput(reservation: ReservationPreVisitSource): boolean {
  return Boolean(reservation.daycare_data || reservation.grooming_data || reservation.hotel_data)
}
