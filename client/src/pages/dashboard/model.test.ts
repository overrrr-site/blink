import { describe, expect, it } from 'vitest'
import { buildDashboardReservationSummary, getFilterOptions } from './model'

interface TestReservation {
  id: number
  status: '予定' | '登園済' | '降園済' | 'キャンセル'
  reservation_time: string
}

describe('dashboard model', () => {
  it('returns grooming filter options without active status', () => {
    const options = getFilterOptions('grooming')

    expect(options.map((option) => option.id)).toEqual(['all', '来園待ち', '帰宅済'])
  })

  it('aggregates counts and groups reservations by time in ascending order', () => {
    const reservations: TestReservation[] = [
      { id: 1, status: '予定', reservation_time: '09:00:00' },
      { id: 2, status: '登園済', reservation_time: '09:30:00' },
      { id: 3, status: '降園済', reservation_time: '08:30:00' },
      { id: 4, status: 'キャンセル', reservation_time: '07:00:00' },
      { id: 5, status: '予定', reservation_time: '09:00:00' },
    ]

    const summary = buildDashboardReservationSummary(reservations, 'all')

    expect(summary.statusCounts).toEqual({
      '来園待ち': 2,
      '在園中': 1,
      '帰宅済': 1,
    })
    expect(summary.currentCount).toBe(4)
    expect(summary.filteredReservations.map((reservation) => reservation.id)).toEqual([1, 2, 3, 5])
    expect(summary.groupedReservations.map(([time]) => time)).toEqual(['08:30', '09:00', '09:30'])
    expect(summary.groupedReservations.map(([, group]) => group.length)).toEqual([1, 2, 1])
  })

  it('filters reservations by selected status while keeping grouping behavior', () => {
    const reservations: TestReservation[] = [
      { id: 1, status: '予定', reservation_time: '09:00:00' },
      { id: 2, status: '登園済', reservation_time: '09:30:00' },
      { id: 3, status: '予定', reservation_time: '09:00:00' },
      { id: 4, status: '降園済', reservation_time: '08:30:00' },
    ]

    const summary = buildDashboardReservationSummary(reservations, '来園待ち')

    expect(summary.filteredReservations.map((reservation) => reservation.id)).toEqual([1, 3])
    expect(summary.groupedReservations).toHaveLength(1)
    expect(summary.groupedReservations[0][0]).toBe('09:00')
    expect(summary.groupedReservations[0][1].map((reservation) => reservation.id)).toEqual([1, 3])
  })
})
