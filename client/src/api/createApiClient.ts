import axios from 'axios'
import { supabase } from '../lib/supabase'

type CreateApiClientOptions = {
  baseURL: string
  tokenKey: string
  userKey?: string
  loginPath: string
}

let cachedToken: string | null = null
let tokenExpiresAt = 0

export function createApiClient({ baseURL, tokenKey, userKey, loginPath }: CreateApiClientOptions) {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use(
    async (config) => {
      const now = Date.now()
      // 有効期限の1分前まではキャッシュを利用
      if (cachedToken && now < tokenExpiresAt - 60_000) {
        config.headers.Authorization = `Bearer ${cachedToken}`
        return config
      }

      // Supabase セッションからトークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        cachedToken = session.access_token
        tokenExpiresAt = (session.expires_at ?? 0) * 1000
        config.headers.Authorization = `Bearer ${session.access_token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(tokenKey)
        if (userKey) {
          localStorage.removeItem(userKey)
        }
        window.location.href = loginPath
      }
      return Promise.reject(error)
    }
  )

  return client
}
