import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()
const sendStoreOwnerPaymentFailedNotificationMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

vi.mock('../services/notificationService.js', () => ({
  sendStoreOwnerPaymentFailedNotification: sendStoreOwnerPaymentFailedNotificationMock,
}))

async function getHandler() {
  const { default: router } = await import('../routes/billingWebhook.js')
  const layer = router.stack.find((entry) => entry.route?.path === '/' && (entry.route as { methods?: Record<string, boolean> }).methods?.post)
  return layer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
}

describe('billing webhook', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    sendStoreOwnerPaymentFailedNotificationMock.mockReset()
    process.env.PAYJP_WEBHOOK_TOKEN = 'test-webhook-token'
  })

  it('skips duplicate processed events by event.id', async () => {
    const handler = await getHandler()
    expect(handler).toBeTypeOf('function')

    poolQueryMock.mockResolvedValueOnce({
      rows: [{ id: 11, processed: true }],
    })

    const req = {
      headers: {
        'x-payjp-webhook-token': 'test-webhook-token',
      },
      body: {
        id: 'evt_duplicate',
        type: 'charge.failed',
        data: { object: { subscription: 'sub_1', id: 'ch_1' } },
      },
    } as unknown as Request
    const res = {
      json: vi.fn(),
    } as unknown as Response

    await handler!(req, res)

    expect(res.json).toHaveBeenCalledWith({ received: true, duplicate: true })
    expect(sendStoreOwnerPaymentFailedNotificationMock).not.toHaveBeenCalled()
    expect(poolQueryMock).toHaveBeenCalledTimes(1)
  })
})
