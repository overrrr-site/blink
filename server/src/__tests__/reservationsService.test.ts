import { beforeEach, describe, expect, it, vi } from 'vitest'

const poolQueryMock = vi.fn()
const getGoogleCalendarIntegrationMock = vi.fn()
const createCalendarEventMock = vi.fn()
const updateCalendarEventMock = vi.fn()
const deleteCalendarEventMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

vi.mock('../services/googleCalendar.js', () => ({
  getGoogleCalendarIntegration: getGoogleCalendarIntegrationMock,
  createCalendarEvent: createCalendarEventMock,
  updateCalendarEvent: updateCalendarEventMock,
  deleteCalendarEvent: deleteCalendarEventMock,
}))

describe('reservationsService calendar sync', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    getGoogleCalendarIntegrationMock.mockReset()
    createCalendarEventMock.mockReset()
    updateCalendarEventMock.mockReset()
    deleteCalendarEventMock.mockReset()
  })

  it('skips sync when Google Calendar integration is not enabled', async () => {
    getGoogleCalendarIntegrationMock.mockResolvedValue(null)

    const { syncCalendarOnCreate } = await import('../services/reservationsService.js')
    const result = await syncCalendarOnCreate({
      storeId: 1,
      dogId: 10,
      reservation: {
        id: 5,
        reservation_date: '2026-03-31',
        reservation_time: '09:00',
      },
    })

    expect(result).toEqual({ status: 'skipped' })
    expect(poolQueryMock).not.toHaveBeenCalled()
    expect(createCalendarEventMock).not.toHaveBeenCalled()
  })

  it('returns a re-auth warning when Google Calendar token refresh fails', async () => {
    getGoogleCalendarIntegrationMock.mockResolvedValue({ id: 1, enabled: true })
    poolQueryMock.mockResolvedValue({
      rows: [{ dog_name: 'Pochi', owner_name: 'Yamada' }],
    })
    createCalendarEventMock.mockRejectedValue(new Error('invalid_grant'))

    const { syncCalendarOnCreate } = await import('../services/reservationsService.js')
    const result = await syncCalendarOnCreate({
      storeId: 1,
      dogId: 10,
      reservation: {
        id: 5,
        reservation_date: '2026-03-31',
        reservation_time: '09:00',
      },
    })

    expect(result).toEqual({
      status: 'failed',
      reason: 'Googleカレンダーの再認証が必要です',
    })
  })
})
