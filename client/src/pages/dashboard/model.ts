import { getDashboardStatusLabels } from '../../domain/businessTypeConfig'
import type { RecordType } from '../../types/record'
import {
  getDisplayStatus,
  type DashboardDisplayStatus,
  type ReservationCardStatus,
} from '../../components/dashboard/reservationCardModel'

export type StatusFilter = 'all' | DashboardDisplayStatus

export interface FilterConfig {
  id: StatusFilter
  label: string
  icon: string
  accentColor: string
}

interface DashboardReservationBase {
  status: ReservationCardStatus
  reservation_time: string
}

export interface DashboardReservationSummary<TReservation extends DashboardReservationBase> {
  statusCounts: Record<DashboardDisplayStatus, number>
  currentCount: number
  filteredReservations: TReservation[]
  groupedReservations: Array<[string, TReservation[]]>
}

export function getFilterOptions(businessType: RecordType | null): FilterConfig[] {
  const labels = getDashboardStatusLabels(businessType)

  if (businessType === 'grooming') {
    return [
      { id: 'all', label: 'すべて', icon: 'solar:list-bold', accentColor: 'bg-primary' },
      { id: '来園待ち', label: labels.waiting, icon: 'solar:clock-circle-bold', accentColor: 'bg-chart-4' },
      { id: '帰宅済', label: labels.done, icon: 'solar:check-circle-bold', accentColor: 'bg-chart-3' },
    ]
  }

  return [
    { id: 'all', label: 'すべて', icon: 'solar:list-bold', accentColor: 'bg-primary' },
    { id: '来園待ち', label: labels.waiting, icon: 'solar:clock-circle-bold', accentColor: 'bg-chart-4' },
    { id: '在園中', label: labels.active, icon: 'solar:home-smile-bold', accentColor: 'bg-chart-2' },
    { id: '帰宅済', label: labels.done, icon: 'solar:check-circle-bold', accentColor: 'bg-chart-3' },
  ]
}

export function buildDashboardReservationSummary<TReservation extends DashboardReservationBase>(
  reservations: TReservation[],
  statusFilter: StatusFilter
): DashboardReservationSummary<TReservation> {
  const counts: Record<DashboardDisplayStatus, number> = {
    '来園待ち': 0,
    '在園中': 0,
    '帰宅済': 0,
  }
  const groups: Record<string, TReservation[]> = {}
  const filtered: TReservation[] = []

  for (const reservation of reservations) {
    if (reservation.status === 'キャンセル') continue

    const displayStatus = getDisplayStatus(reservation)
    counts[displayStatus] += 1

    if (statusFilter === 'all' || displayStatus === statusFilter) {
      filtered.push(reservation)
      const time = reservation.reservation_time.slice(0, 5)
      if (!groups[time]) {
        groups[time] = []
      }
      groups[time].push(reservation)
    }
  }

  return {
    statusCounts: counts,
    currentCount: counts['来園待ち'] + counts['在園中'] + counts['帰宅済'],
    filteredReservations: filtered,
    groupedReservations: Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
  }
}
