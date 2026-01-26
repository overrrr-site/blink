import { createApiClient } from '../../api/createApiClient'

// 本番環境では相対パス、開発環境ではlocalhost
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

const liffClient = createApiClient({
  baseURL: `${API_BASE_URL}/api/liff`,
  tokenKey: 'liff_token',
  userKey: 'liff_user',
  loginPath: '/liff/',  // ログインページは/liff/のルート
})

export default liffClient
