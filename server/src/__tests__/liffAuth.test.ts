import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

const poolQueryMock = vi.fn()
const sendEmailMock = vi.fn()
const signOwnerTokenMock = vi.fn(() => 'test-token')
const verifyLineIdentityMock = vi.fn(async (_idToken: string, expectedLineUserId?: string) => ({
  userId: expectedLineUserId ?? 'U123',
}))

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

vi.mock('../services/emailService.js', () => ({
  sendEmail: sendEmailMock,
}))

vi.mock('../routes/liff/common.js', () => ({
  generateVerificationCode: vi.fn(() => '123456'),
  maskEmail: vi.fn(() => 't***@example.com'),
}))

vi.mock('../routes/liff/security.js', () => ({
  signOwnerToken: signOwnerTokenMock,
  verifyLineIdentity: verifyLineIdentityMock,
  SecurityConfigurationError: class SecurityConfigurationError extends Error {},
}))

async function getRouteHandler(path: string, method: 'post') {
  const { default: router } = await import('../routes/liff/auth.js')
  const layer = router.stack.find((entry) => entry.route?.path === path && (entry.route as { methods?: Record<string, boolean> }).methods?.[method])
  return layer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>)
}

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response
}

describe('LIFF link auth', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    sendEmailMock.mockReset()
    sendEmailMock.mockResolvedValue(true)
    signOwnerTokenMock.mockClear()
    verifyLineIdentityMock.mockClear()
  })

  it('stores owner_id and store_id in scoped link requests', async () => {
    const handler = await getRouteHandler('/link/request', 'post')
    expect(handler).toBeTypeOf('function')

    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            store_id: 2,
            email: 'test@example.com',
            line_id: null,
            name: 'Owner',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const req = {
      body: {
        idToken: 'id-token',
        phone: '090-1234-5678',
        lineUserId: 'U123',
        ownerId: 10,
        storeId: 2,
      },
    } as unknown as Request
    const res = createResponse()

    await handler!(req, res)

    expect(poolQueryMock.mock.calls[0]?.[1]).toEqual(['09012345678', 10, 2])
    expect(poolQueryMock.mock.calls[2]?.[1]).toEqual([
      '09012345678',
      '123456',
      'U123',
      10,
      2,
      expect.any(Date),
    ])
    expect(sendEmailMock).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('確認コード'),
      expect.stringContaining('123456'),
      expect.any(String),
    )
    expect(res.json).toHaveBeenCalledWith({
      message: '確認コードを送信しました',
      maskedEmail: 't***@example.com',
    })
  })

  it('returns 409 for phone-only requests when the phone exists in multiple stores', async () => {
    const handler = await getRouteHandler('/link/request', 'post')
    expect(handler).toBeTypeOf('function')

    poolQueryMock.mockResolvedValueOnce({
      rows: [
        { id: 10, store_id: 2, email: 'a@example.com', line_id: null },
        { id: 11, store_id: 3, email: 'b@example.com', line_id: null },
      ],
    })

    const req = {
      body: {
        idToken: 'id-token',
        phone: '09012345678',
        lineUserId: 'U123',
      },
    } as unknown as Request
    const res = createResponse()

    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      error: 'この電話番号は複数の店舗で登録されています。店舗にお問い合わせください。',
    })
  })

  it('verifies using scoped owner/store data and updates only the intended owner', async () => {
    const handler = await getRouteHandler('/link/verify', 'post')
    expect(handler).toBeTypeOf('function')

    poolQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 99,
            phone: '09012345678',
            line_user_id: 'U123',
            owner_id: 10,
            store_id: 2,
            attempts: 0,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            store_id: 2,
            name: 'Owner',
            line_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    const req = {
      body: {
        idToken: 'id-token',
        phone: '09012345678',
        code: '123456',
        lineUserId: 'U123',
        ownerId: 10,
        storeId: 2,
      },
    } as unknown as Request
    const res = createResponse()

    await handler!(req, res)

    expect(poolQueryMock.mock.calls[1]?.[1]).toEqual(['09012345678', 10, 2])
    expect(poolQueryMock.mock.calls[2]?.[1]).toEqual(['U123', 10])
    expect(poolQueryMock.mock.calls[3]?.[1]).toEqual([99])
    expect(res.json).toHaveBeenCalledWith({
      token: 'test-token',
      owner: {
        id: 10,
        name: 'Owner',
        storeId: 2,
        lineUserId: 'U123',
      },
      message: 'LINEアカウントの紐付けが完了しました',
    })
  })
})
