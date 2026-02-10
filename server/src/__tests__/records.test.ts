import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

describe('Records API', () => {
  beforeEach(() => {
    poolQueryMock.mockReset()
  })

  it('returns 400 when required fields are missing', async () => {
    const { default: recordsRouter } = await import('../routes/records.js')
    const routeLayer = recordsRouter.stack.find((layer) => layer.route?.path === '/' && (layer.route as unknown as Record<string, unknown>)?.methods && (layer.route as unknown as { methods: Record<string, boolean> }).methods.post)
    const handler = routeLayer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
    expect(handler).toBeTypeOf('function')

    const req = {
      body: { record_type: 'grooming', record_date: '2024-01-01' },
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

  it('filters records by record_type when provided', async () => {
    const { default: recordsRouter } = await import('../routes/records.js')
    const routeLayer = recordsRouter.stack.find((layer) => layer.route?.path === '/' && (layer.route as unknown as Record<string, unknown>)?.methods && (layer.route as unknown as { methods: Record<string, boolean> }).methods.get)
    const handler = routeLayer?.route?.stack?.[routeLayer.route.stack.length - 1]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
    expect(handler).toBeTypeOf('function')

    poolQueryMock.mockResolvedValueOnce({ rows: [{ total_count: 1 }] })

    const req = {
      query: { record_type: 'grooming', page: '1', limit: '10' },
      storeId: 1,
    } as unknown as Request
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as unknown as Response

    await handler!(req, res)

    const call = poolQueryMock.mock.calls[0]
    const query = call?.[0] as string | undefined
    const params = call?.[1] as unknown[] | undefined
    expect(query).toContain('dog_name')
    expect(query).toContain('owner_name')
    expect(params).toEqual(expect.arrayContaining(['grooming']))
  })
})
