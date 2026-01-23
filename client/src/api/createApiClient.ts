import axios from 'axios'

type CreateApiClientOptions = {
  baseURL: string
  tokenKey: string
  userKey?: string
  loginPath: string
}

export function createApiClient({ baseURL, tokenKey, userKey, loginPath }: CreateApiClientOptions) {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(tokenKey)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
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
