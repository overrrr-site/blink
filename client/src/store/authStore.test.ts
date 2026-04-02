import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSessionMock, onAuthStateChangeMock, signOutMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}))

vi.mock('@sentry/react', () => ({
  setUser: vi.fn(),
  setTag: vi.fn(),
}))

import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
    })

    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })

    signOutMock.mockResolvedValue(undefined)

    useAuthStore.setState({
      user: null,
      supabaseUser: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
    })
  })

  it('removes invalid cached staff data and legacy auth keys during initialize', async () => {
    localStorage.setItem('staff_user', '{invalid-json')
    localStorage.setItem('token', 'legacy-token')
    localStorage.setItem('user', '{"id":1}')

    await useAuthStore.getState().initialize()

    expect(localStorage.getItem('staff_user')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('clears current and legacy auth storage during logout', async () => {
    localStorage.setItem('staff_user', '{"id":1}')
    localStorage.setItem('token', 'legacy-token')
    localStorage.setItem('user', '{"id":1}')

    await useAuthStore.getState().logout()

    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('staff_user')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
