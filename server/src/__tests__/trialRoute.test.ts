import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()
const poolConnectMock = vi.fn()
const invalidateStaffCacheMock = vi.fn()
const encryptMock = vi.fn((value: string) => `encrypted:${value}`)
const clearStoreLineClientCacheMock = vi.fn()
const validateLineCredentialsMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: {
    query: poolQueryMock,
    connect: poolConnectMock,
  },
}))

vi.mock('../db/supabase.js', () => ({
  supabase: null,
}))

vi.mock('../middleware/auth.js', () => ({
  authenticate: (_req: Request, _res: Response, next: () => void) => next(),
  requireOwner: (_req: Request, _res: Response, next: () => void) => next(),
  invalidateStaffCache: invalidateStaffCacheMock,
}))

vi.mock('../utils/encryption.js', () => ({
  encrypt: encryptMock,
}))

vi.mock('../services/lineMessagingService.js', () => ({
  clearStoreLineClientCache: clearStoreLineClientCacheMock,
  validateLineCredentials: validateLineCredentialsMock,
}))

async function getRouteHandler(path: string, method: 'post') {
  const { default: router } = await import('../routes/trial.js')
  const layer = router.stack.find((entry) => entry.route?.path === path && (entry.route as { methods?: Record<string, boolean> }).methods?.[method])
  return layer?.route?.stack?.at(-1)?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
}

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
}

describe('trial routes', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    poolConnectMock.mockReset()
    invalidateStaffCacheMock.mockReset()
    encryptMock.mockClear()
    clearStoreLineClientCacheMock.mockReset()
    validateLineCredentialsMock.mockReset()
  })

  it('returns LINE validation errors from /line/test', async () => {
    const handler = await getRouteHandler('/line/test', 'post')
    expect(handler).toBeTypeOf('function')

    validateLineCredentialsMock.mockResolvedValue({
      ok: false,
      kind: 'invalid',
      message: 'LINEチャネルアクセストークンが無効です',
      statusCode: 401,
    })

    const req = {
      storeId: 1,
      body: {
        line_channel_id: '1234567890',
        line_channel_secret: 'secret',
        line_channel_access_token: 'invalid-token',
      },
    } as unknown as Request
    const res = createResponse()

    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'LINEチャネルアクセストークンが無効です',
      statusCode: 401,
    })
  })

  it('blocks trial conversion when LINE validation fails', async () => {
    const handler = await getRouteHandler('/convert', 'post')
    expect(handler).toBeTypeOf('function')

    poolQueryMock.mockResolvedValueOnce({
      rows: [{ is_trial: true }],
    })
    validateLineCredentialsMock.mockResolvedValue({
      ok: false,
      kind: 'invalid',
      message: 'LINEチャネルアクセストークンが無効です',
      statusCode: 401,
    })

    const req = {
      storeId: 1,
      body: {
        line_channel_id: '1234567890',
        line_channel_secret: 'secret',
        line_channel_access_token: 'invalid-token',
        confirm_delete_all: true,
      },
    } as unknown as Request
    const res = createResponse()

    await handler!(req, res)

    expect(poolQueryMock).toHaveBeenCalledWith(
      'SELECT is_trial FROM stores WHERE id = $1',
      [1]
    )
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'LINEチャネルアクセストークンが無効です',
      statusCode: 401,
    })
    expect(poolConnectMock).not.toHaveBeenCalled()
  })
})
