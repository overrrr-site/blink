import { createApiClient } from './createApiClient'

const api = createApiClient({
  baseURL: '/api',
  tokenKey: 'token',
  userKey: 'user',
  loginPath: '/login',
})

export default api
