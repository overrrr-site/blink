import { create } from 'zustand'
import axios from 'axios'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface StaffUser {
  id: number
  email: string
  name: string
  storeId: number
  isOwner: boolean
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

export const useAuthStore = create<AuthState>((set, get) => {
  return {
    user: null,
    supabaseUser: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,

    // Supabase Auth でメールログイン
    login: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message || 'ログインに失敗しました')
      }

      if (data.session) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.session.access_token}`
        await get().fetchStaffInfo(data.session.access_token)
        set({
          supabaseUser: data.user,
          session: data.session,
          isAuthenticated: true,
        })
      }
    },

    // Supabase Auth でGoogleログイン
    loginWithGoogle: async () => {
      // 本番環境のURLを取得
      // VITE_FRONTEND_URLがあればそれを使用、なければwindow.location.origin
      // 本番環境ではwindow.location.originが正しく動作するはず
      const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin
      const redirectUrl = `${frontendUrl}/auth/callback`

      console.log('Googleログイン - Redirect URL:', redirectUrl)
      console.log('Current origin:', window.location.origin)
      console.log('VITE_FRONTEND_URL:', import.meta.env.VITE_FRONTEND_URL)

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

    // ログアウト
    logout: async () => {
      await supabase.auth.signOut()
      delete axios.defaults.headers.common['Authorization']
      localStorage.removeItem('staff_user')
      set({
        user: null,
        supabaseUser: null,
        session: null,
        isAuthenticated: false,
      })
    },

    // スタッフ情報をバックエンドから取得
    fetchStaffInfo: async (accessToken: string) => {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        const response = await axios.get('/api/auth/me')
        const staffUser = response.data
        localStorage.setItem('staff_user', JSON.stringify(staffUser))
        set({ user: staffUser })
      } catch (error: any) {
        console.error('スタッフ情報の取得に失敗しました:', error)
        console.error('エラー詳細:', {
          message: error?.message,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          url: error?.config?.url
        })
        
        // エラーメッセージを詳細に表示
        const errorMessage = error?.response?.data?.error || error?.response?.data?.details || error?.message || 'スタッフ情報の取得に失敗しました'
        const errorDetails = error?.response?.data?.details ? `\n詳細: ${error.response.data.details}` : ''
        
        // スタッフ情報が取得できない場合はログアウト
        await get().logout()
        throw new Error(`${errorMessage}${errorDetails}\n\n管理者に連絡してください。`)
      }
    },

    // 初期化（アプリ起動時に呼び出し）
    initialize: async () => {
      set({ isLoading: true })

      // ローカルストレージからスタッフ情報を復元
      const staffUserStr = localStorage.getItem('staff_user')
      const cachedStaffUser = staffUserStr ? JSON.parse(staffUserStr) : null

      // Supabaseのセッションを確認
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`

        // キャッシュされたスタッフ情報があればまず設定
        if (cachedStaffUser) {
          set({
            user: cachedStaffUser,
            supabaseUser: session.user,
            session,
            isAuthenticated: true,
            isLoading: false,
          })
        }

        // バックエンドからスタッフ情報を取得（バックグラウンドで更新）
        try {
          await get().fetchStaffInfo(session.access_token)
          set({
            supabaseUser: session.user,
            session,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          // スタッフ情報の取得に失敗した場合
          set({ isLoading: false })
        }
      } else {
        set({ isLoading: false })
      }

      // セッション変更を監視
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`
          try {
            await get().fetchStaffInfo(session.access_token)
            set({
              supabaseUser: session.user,
              session,
              isAuthenticated: true,
            })
          } catch {
            // スタッフ情報の取得に失敗
          }
        } else if (event === 'SIGNED_OUT') {
          delete axios.defaults.headers.common['Authorization']
          localStorage.removeItem('staff_user')
          set({
            user: null,
            supabaseUser: null,
            session: null,
            isAuthenticated: false,
          })
        } else if (event === 'TOKEN_REFRESHED' && session) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`
          set({ session })
        }
      })
    },
  }
})
