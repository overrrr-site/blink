import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

describe('AI API', () => {
  beforeEach(() => {
    poolQueryMock.mockReset()
  })

  it('returns 400 when suggestions record is missing', async () => {
    const { default: aiRouter } = await import('../routes/ai.js')
    const routeLayer = aiRouter.stack.find((layer) => layer.route?.path === '/suggestions/:recordId')
    const handler = routeLayer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
    expect(handler).toBeTypeOf('function')

    poolQueryMock.mockResolvedValueOnce({ rows: [] })

    const req = {
      params: { recordId: '999' },
      storeId: 1,
    } as unknown as Request
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response

    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('scopes AI feedback updates by store id', async () => {
    const { default: aiRouter } = await import('../routes/ai.js')
    const routeLayer = aiRouter.stack.find((layer) => layer.route?.path === '/feedback')
    const handler = routeLayer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
    expect(handler).toBeTypeOf('function')

    poolQueryMock.mockResolvedValueOnce({ rows: [] })

    const req = {
      body: { learning_data_id: 1, was_used: true, was_edited: false, final_text: 'text' },
      storeId: 10,
    } as unknown as Request
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as unknown as Response

    await handler!(req, res)

    const query = poolQueryMock.mock.calls[0]?.[0] as string | undefined
    expect(query).toContain('store_id')
  })
})
