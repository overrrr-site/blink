import { createApiClient } from '../../api/createApiClient'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const liffClient = createApiClient({
  baseURL: `${API_BASE_URL}/api/liff`,
  tokenKey: 'liff_token',
  userKey: 'liff_user',
  loginPath: '/liff.html#/login',
})

export default liffClient
