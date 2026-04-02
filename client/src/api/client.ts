import { createApiClient } from './createApiClient'

const api = createApiClient({
  baseURL: '/api',
  tokenKey: 'staff_user',
  loginPath: '/login',
})

export default api
