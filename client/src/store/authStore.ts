import { create } from 'zustand'
import axios from 'axios'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import * as Sentry from '@sentry/react'

import type { RecordType } from '../types/record'

interface StaffUser {
  id: number
  email: string
  name: string
  storeId: number
  isOwner: boolean
  businessTypes?: RecordType[]
  primaryBusinessType?: RecordType
  onboardingCompleted?: boolean
  assignedBusinessTypes?: RecordType[] | null // nullの場合は全業種アクセス可（管理者）
}

interface AuthState {
  user: StaffUser | null
  supabaseUser: SupabaseUser | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  initialize: () => Promise<void>
  fetchStaffInfo: (accessToken: string) => Promise<void>
}

const UNAUTHENTICATED_STATE = {
  user: null,
  supabaseUser: null,
  session: null,
  isAuthenticated: false,
} as const

function setAuthHeader(token: string): void {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

function clearAuthHeader(): void {
  delete axios.defaults.headers.common['Authorization']
}

function setSentryContext(staff: StaffUser | null): void {
  if (!staff) return
  Sentry.setUser({
    id: staff.id.toString(),
    email: staff.email,
  })
  Sentry.setTag('store_id', staff.storeId.toString())
  Sentry.setTag('is_owner', staff.isOwner.toString())
}

function clearSentryContext(): void {
  Sentry.setUser(null)
  Sentry.setTag('store_id', '')
  Sentry.setTag('is_owner', '')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...UNAUTHENTICATED_STATE,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message || 'ログインに失敗しました')
    }

    if (data.session) {
      setAuthHeader(data.session.access_token)
      await get().fetchStaffInfo(data.session.access_token)
      set({
        supabaseUser: data.user,
        session: data.session,
        isAuthenticated: true,
      })
    }
  },

  loginWithGoogle: async () => {
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin
    const redirectUrl = `${frontendUrl}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (error) {
      throw new Error(error.message || 'Googleログインに失敗しました')
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    clearAuthHeader()
    localStorage.removeItem('staff_user')
    clearSentryContext()
    set(UNAUTHENTICATED_STATE)
  },

  fetchStaffInfo: async (accessToken: string) => {
    try {
      setAuthHeader(accessToken)
      const response = await axios.get('/api/auth/me')
      localStorage.setItem('staff_user', JSON.stringify(response.data))
      setSentryContext(response.data)
      set({ user: response.data })
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string; details?: string } }; message?: string }
      const errorMessage = axiosError.response?.data?.error || axiosError.response?.data?.details || axiosError.message || 'スタッフ情報の取得に失敗しました'

      await get().logout()
      throw new Error(`${errorMessage}\n\n管理者に連絡してください。`)
    }
  },

  initialize: async () => {
    set({ isLoading: true })

    const staffUserStr = localStorage.getItem('staff_user')
    const cachedStaffUser = staffUserStr ? JSON.parse(staffUserStr) : null

    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      setAuthHeader(session.access_token)

      // Show cached staff info immediately while refreshing in background
      if (cachedStaffUser) {
        set({
          user: cachedStaffUser,
          supabaseUser: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
        })
        setSentryContext(cachedStaffUser)
      }

      try {
        await get().fetchStaffInfo(session.access_token)
        set({
          supabaseUser: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        set({ isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setAuthHeader(session.access_token)
        try {
          await get().fetchStaffInfo(session.access_token)
          set({
            supabaseUser: session.user,
            session,
            isAuthenticated: true,
          })
        } catch {
          // Staff info fetch failed - already handled by fetchStaffInfo
        }
      } else if (event === 'SIGNED_OUT') {
        clearAuthHeader()
        localStorage.removeItem('staff_user')
        clearSentryContext()
        set(UNAUTHENTICATED_STATE)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setAuthHeader(session.access_token)
        set({ session })
      }
    })
  },
}))
