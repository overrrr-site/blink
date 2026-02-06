import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Response } from 'express'
import type { AuthRequest } from '../middleware/auth.js'

const jwtVerifyMock = vi.fn()
const createRemoteJWKSetMock = vi.fn(() => ({}))
const poolQueryMock = vi.fn()

vi.mock('jose', () => ({
  jwtVerify: jwtVerifyMock,
  createRemoteJWKSet: createRemoteJWKSetMock,
}))

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    jwtVerifyMock.mockReset()
    createRemoteJWKSetMock.mockClear()
    poolQueryMock.mockReset()
  })

  it('returns 401 when token is missing', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'

    const { authenticate } = await import('../middleware/auth.js')
    const req = { headers: {} } as AuthRequest
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response
    const next = vi.fn()

    await authenticate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('attaches staff data and calls next when JWT verifies', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    jwtVerifyMock.mockResolvedValue({
      payload: { sub: 'auth-user-id' },
    })
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          id: 1,
          email: 'staff@example.com',
          name: 'Staff',
          is_owner: true,
          store_id: 10,
          assigned_business_types: null,
        },
      ],
    })

    const { authenticate } = await import('../middleware/auth.js')
    const req = {
      headers: { authorization: 'Bearer token' },
    } as AuthRequest
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response
    const next = vi.fn()

    await authenticate(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.userId).toBe(1)
    expect(req.storeId).toBe(10)
    expect(req.isOwner).toBe(true)
    expect(req.staffData?.email).toBe('staff@example.com')
  })
})
