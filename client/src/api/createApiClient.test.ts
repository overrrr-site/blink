import { beforeEach, describe, expect, it, vi } from 'vitest'

let requestHandler: ((config: { headers: Record<string, string> }) => Promise<{ headers: Record<string, string> }> | { headers: Record<string, string> }) | undefined
let responseErrorHandler: ((error: { response?: { status?: number } }) => Promise<never>) | undefined

const { axiosCreateMock, getSessionMock } = vi.hoisted(() => ({
  axiosCreateMock: vi.fn(),
  getSessionMock: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: axiosCreateMock,
  },
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}))

import { clearCachedToken, createApiClient } from './createApiClient'

describe('createApiClient', () => {
  beforeEach(() => {
    requestHandler = undefined
    responseErrorHandler = undefined

    vi.clearAllMocks()
    localStorage.clear()
    clearCachedToken()

    axiosCreateMock.mockImplementation(() => ({
      interceptors: {
        request: {
          use: vi.fn((fulfilled) => {
            requestHandler = fulfilled
            return 0
          }),
        },
        response: {
          use: vi.fn((_fulfilled, rejected) => {
            responseErrorHandler = rejected
            return 0
          }),
        },
      },
    }))

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/' },
    })
  })

  it('clears cached tokens, storage, and redirects on 401 responses', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'fresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    })

    createApiClient({
      baseURL: '/api',
      tokenKey: 'staff_user',
      loginPath: '/login',
    })

    if (!requestHandler || !responseErrorHandler) {
      throw new Error('API interceptors were not registered')
    }

    const initialConfig = await requestHandler({ headers: {} })
    expect(initialConfig.headers.Authorization).toBe('Bearer fresh-token')

    localStorage.setItem('staff_user', '{"id":1}')
    localStorage.setItem('token', 'legacy-token')
    localStorage.setItem('user', '{"id":1}')

    const unauthorizedError = { response: { status: 401 } }
    await expect(responseErrorHandler(unauthorizedError)).rejects.toBe(unauthorizedError)

    expect(localStorage.getItem('staff_user')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(window.location.href).toBe('/login')

    getSessionMock.mockResolvedValueOnce({
      data: {
        session: null,
      },
    })

    const nextConfig = await requestHandler({ headers: {} })
    expect(nextConfig.headers.Authorization).toBeUndefined()
  })
})
