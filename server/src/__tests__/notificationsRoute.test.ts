import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()
const getStoreLineConnectionStatusMock = vi.fn()
const describeLineConnectionIssueMock = vi.fn()
const sendLineMessageDetailedMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

vi.mock('../services/lineMessagingService.js', () => ({
  getStoreLineConnectionStatus: getStoreLineConnectionStatusMock,
  describeLineConnectionIssue: describeLineConnectionIssueMock,
  sendLineMessageDetailed: sendLineMessageDetailedMock,
}))

async function getRouteHandler(path: string, method: 'get' | 'post') {
  const { default: router } = await import('../routes/notifications.js')
  const layer = router.stack.find((entry) => entry.route?.path === path && (entry.route as { methods?: Record<string, boolean> }).methods?.[method])
  return layer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
}

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
}

describe('notifications routes', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    getStoreLineConnectionStatusMock.mockReset()
    describeLineConnectionIssueMock.mockReset()
    sendLineMessageDetailedMock.mockReset()
  })

  it('surfaces missing trial LINE env in test-line', async () => {
    const handler = await getRouteHandler('/test-line', 'post')
    expect(handler).toBeTypeOf('function')

    getStoreLineConnectionStatusMock.mockResolvedValue({
      connected: false,
      isTrial: true,
      source: 'none',
      missing: ['TRIAL_LINE_CHANNEL_ID', 'TRIAL_LINE_CHANNEL_SECRET'],
    })
    describeLineConnectionIssueMock.mockReturnValue(
      'トライアルLINE認証情報が未設定です: TRIAL_LINE_CHANNEL_ID, TRIAL_LINE_CHANNEL_SECRET'
    )

    const req = {
      storeId: 1,
      body: {},
    } as unknown as Request
    const res = createResponse()

    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'トライアルLINE認証情報が不足しています',
      missing: ['TRIAL_LINE_CHANNEL_ID', 'TRIAL_LINE_CHANNEL_SECRET'],
      isTrial: true,
      source: 'none',
      message: 'トライアルLINE認証情報が未設定です: TRIAL_LINE_CHANNEL_ID, TRIAL_LINE_CHANNEL_SECRET',
    })
    expect(poolQueryMock).not.toHaveBeenCalled()
  })
})
