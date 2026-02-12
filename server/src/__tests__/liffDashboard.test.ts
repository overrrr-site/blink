import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()
const requireOwnerTokenMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

vi.mock('../routes/liff/common.js', () => ({
  requireOwnerToken: requireOwnerTokenMock,
}))

function createResponseMock() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
}

function getRouteHandler(router: any, path: string, method: 'get' | 'post') {
  const layer = router.stack.find((stackLayer: any) => (
    stackLayer.route?.path === path
    && stackLayer.route?.methods?.[method]
  ))
  return layer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
}

describe('LIFF dashboard summary route', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    requireOwnerTokenMock.mockReset()
  })

  it('returns dashboard summary with unread announcements', async () => {
    requireOwnerTokenMock.mockReturnValue({ ownerId: 10, storeId: 20, type: 'owner' })

    poolQueryMock
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          reservation_date: '2026-02-13',
          reservation_time: '09:00',
          status: '予定',
          checked_in_at: null,
          checked_out_at: null,
          dog_name: 'ココ',
          dog_photo: null,
          has_pre_visit_input: false,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 10,
          record_date: '2026-02-11',
          dog_name: 'ココ',
          dog_photo: null,
          excerpt: '本日も元気に過ごしました',
          photo_count: 3,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ total: 5, unread: 2 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 7, title: '来週の営業案内', published_at: '2026-02-12T09:00:00.000Z', is_important: true }],
      })

    const { default: dashboardRouter } = await import('../routes/liff/dashboard.js')
    const handler = getRouteHandler(dashboardRouter, '/dashboard/summary', 'get')
    expect(handler).toBeTypeOf('function')

    const req = { query: { service_type: 'daycare' } } as unknown as Request
    const res = createResponseMock()

    await handler!(req, res)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      service_type: 'daycare',
      next_reservation: expect.objectContaining({ id: 1, dog_name: 'ココ' }),
      latest_record: expect.objectContaining({ id: 10, photo_count: 3 }),
      announcements: {
        total: 5,
        unread: 2,
        latest: expect.objectContaining({ id: 7 }),
      },
    })
  })

  it('returns 400 when service_type is invalid', async () => {
    requireOwnerTokenMock.mockReturnValue({ ownerId: 10, storeId: 20, type: 'owner' })

    const { default: dashboardRouter } = await import('../routes/liff/dashboard.js')
    const handler = getRouteHandler(dashboardRouter, '/dashboard/summary', 'get')
    expect(handler).toBeTypeOf('function')

    const req = { query: { service_type: 'invalid-type' } } as unknown as Request
    const res = createResponseMock()

    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(poolQueryMock).not.toHaveBeenCalled()
  })
})
