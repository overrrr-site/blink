import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const poolQueryMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

describe('notification date boundaries', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    poolQueryMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses JST day arithmetic for reservation reminders at midnight boundary', async () => {
    vi.setSystemTime(new Date('2026-03-30T15:30:00.000Z'))

    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            store_id: 1,
            reminder_before_visit: true,
            reminder_before_visit_days: 1,
            line_notification_enabled: true,
            email_notification_enabled: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const { sendReservationReminders } = await import('../services/notificationService.js')
    await sendReservationReminders()

    expect(poolQueryMock.mock.calls[1]?.[1]).toEqual([1, '2026-04-01'])
  })

  it('uses JST day arithmetic for vaccine alerts at midnight boundary', async () => {
    vi.setSystemTime(new Date('2026-03-30T15:30:00.000Z'))

    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            store_id: 1,
            vaccine_alert: true,
            vaccine_alert_days: 14,
            line_notification_enabled: true,
            email_notification_enabled: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const { sendVaccineAlerts } = await import('../services/notificationService.js')
    await sendVaccineAlerts()

    expect(poolQueryMock.mock.calls[1]?.[1]).toEqual([1, '2026-04-14'])
  })
})
