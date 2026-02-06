import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

describe('Reservations API', () => {
  beforeEach(() => {
    poolQueryMock.mockReset()
  })

  it('returns 400 when required fields are missing', async () => {
    const { default: reservationsRouter } = await import('../routes/reservations.js')
    const routeLayer = reservationsRouter.stack.find((layer) => layer.route?.path === '/' && (layer.route as unknown as Record<string, unknown>)?.methods && (layer.route as unknown as { methods: Record<string, boolean> }).methods.post)
    const handler = routeLayer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
    expect(handler).toBeTypeOf('function')

    const req = {
      body: { dog_id: 1 },
      storeId: 1,
      userId: 2,
    } as unknown as Request
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response

    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})
