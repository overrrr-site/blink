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

describe('LIFF announcements read route', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    requireOwnerTokenMock.mockReset()
  })

  it('marks announcement as read with idempotent insert', async () => {
    requireOwnerTokenMock.mockReturnValue({ ownerId: 5, storeId: 2, type: 'owner' })
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [] })

    const { default: announcementsRouter } = await import('../routes/liff/announcements.js')
    const handler = getRouteHandler(announcementsRouter, '/announcements/:id/read', 'post')
    expect(handler).toBeTypeOf('function')

    const req = {
      params: { id: '7' },
    } as unknown as Request
    const res = createResponseMock()

    await handler!(req, res)

    expect(poolQueryMock).toHaveBeenCalledTimes(2)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('returns 404 when announcement is out of store scope', async () => {
    requireOwnerTokenMock.mockReturnValue({ ownerId: 5, storeId: 2, type: 'owner' })
    poolQueryMock.mockResolvedValueOnce({ rows: [] })

    const { default: announcementsRouter } = await import('../routes/liff/announcements.js')
    const handler = getRouteHandler(announcementsRouter, '/announcements/:id/read', 'post')
    expect(handler).toBeTypeOf('function')

    const req = {
      params: { id: '999' },
    } as unknown as Request
    const res = createResponseMock()

    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(poolQueryMock).toHaveBeenCalledTimes(1)
  })
})
