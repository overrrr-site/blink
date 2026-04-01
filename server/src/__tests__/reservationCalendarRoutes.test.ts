import { beforeEach, describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()
const syncCalendarOnCreateMock = vi.fn()
const syncCalendarOnUpdateMock = vi.fn()
const syncCalendarOnDeleteMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

vi.mock('../services/reservationsService.js', () => ({
  syncCalendarOnCreate: syncCalendarOnCreateMock,
  syncCalendarOnUpdate: syncCalendarOnUpdateMock,
  syncCalendarOnDelete: syncCalendarOnDeleteMock,
}))

function createJsonResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
}

describe('reservation routes calendar sync response', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    syncCalendarOnCreateMock.mockReset()
    syncCalendarOnUpdateMock.mockReset()
    syncCalendarOnDeleteMock.mockReset()
  })

  it('returns calendar_sync details from the staff reservation create route', async () => {
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 11,
          dog_id: 7,
          reservation_date: '2026-03-31',
          reservation_time: '09:00',
          status: '予定',
        },
      ],
    })
    syncCalendarOnCreateMock.mockResolvedValue({
      status: 'failed',
      reason: 'Googleカレンダーの再認証が必要です',
    })

    const { default: reservationsRouter } = await import('../routes/reservations.js')
    const routeLayer = reservationsRouter.stack.find(
      (layer) => layer.route?.path === '/' && (layer.route as { methods?: Record<string, boolean> })?.methods?.post,
    )
    const handler = routeLayer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)

    const req = {
      body: {
        dog_id: 7,
        reservation_date: '2026-03-31',
        reservation_time: '09:00',
        service_type: 'daycare',
      },
      storeId: 3,
      userId: 99,
    } as unknown as Request
    const res = createJsonResponse()

    await handler!(req, res)

    expect(syncCalendarOnCreateMock).toHaveBeenCalledWith({
      storeId: 3,
      dogId: 7,
      reservation: expect.objectContaining({ id: 11 }),
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 11,
      calendar_sync: {
        status: 'failed',
        reason: 'Googleカレンダーの再認証が必要です',
      },
    }))
  })

  it('syncs Google Calendar on LIFF reservation cancel and returns the warning payload', async () => {
    poolQueryMock
      .mockResolvedValueOnce({
        rows: [{ id: 12, dog_id: 7, store_id: 3, status: '予定' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 12, dog_id: 7, store_id: 3, status: 'キャンセル' }],
      })
    syncCalendarOnUpdateMock.mockResolvedValue({
      status: 'failed',
      reason: 'Googleカレンダーの再認証が必要です',
    })

    const { default: liffReservationsRouter } = await import('../routes/liff/reservations.js')
    const routeLayer = liffReservationsRouter.stack.find(
      (layer) => layer.route?.path === '/reservations/:id/cancel'
        && (layer.route as { methods?: Record<string, boolean> })?.methods?.put,
    )
    const handler = routeLayer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)

    const token = jwt.sign({ ownerId: 5, storeId: 3, type: 'owner' }, process.env.JWT_SECRET || 'secret')
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      params: { id: '12' },
      body: {},
    } as unknown as Request
    const res = createJsonResponse()

    await handler!(req, res)

    expect(syncCalendarOnUpdateMock).toHaveBeenCalledWith({
      storeId: 3,
      reservationId: 12,
      reservation: expect.objectContaining({ id: 12, status: 'キャンセル' }),
      status: 'キャンセル',
    })
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: 12,
      calendar_sync: {
        status: 'failed',
        reason: 'Googleカレンダーの再認証が必要です',
      },
    }))
  })
})
