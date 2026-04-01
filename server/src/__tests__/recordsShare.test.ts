import { beforeEach, describe, expect, it, vi } from 'vitest'

const poolQueryMock = vi.fn()
const sendRecordNotificationMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

vi.mock('../services/notificationService.js', () => ({
  sendRecordNotification: sendRecordNotificationMock,
}))

describe('shareRecordForOwner', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    sendRecordNotificationMock.mockReset()
  })

  it('rolls back shared status when outbound notification fails', async () => {
    sendRecordNotificationMock.mockResolvedValue({
      sent: false,
      sentVia: 'app',
      reason: 'LINE連携済みの飼い主ではありません',
    })

    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 5,
            owner_id: 7,
            dog_name: 'Pochi',
            record_date: '2026-03-31',
            record_type: 'daycare',
            report_text: '今日は元気でした',
            photos: null,
            status: 'saved',
            shared_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'shared' }] })
      .mockResolvedValueOnce({ rows: [] })

    const { shareRecordForOwner } = await import('../services/recordsService.js')
    const result = await shareRecordForOwner(1, 5)

    expect(sendRecordNotificationMock).toHaveBeenCalledWith(
      1,
      7,
      expect.objectContaining({
        id: 5,
        dog_name: 'Pochi',
        record_type: 'daycare',
      }),
    )
    expect(poolQueryMock.mock.calls[2]?.[0]).toContain('SET status = $3, shared_at = $4')
    expect(poolQueryMock.mock.calls[2]?.[1]).toEqual([5, 1, 'saved', null])
    expect(result).toEqual({
      ok: false,
      kind: 'notification_failed',
      code: 'RECORD_SHARE_NOTIFICATION_FAILED',
      reason: 'LINE連携済みの飼い主ではありません',
    })
  })
})
