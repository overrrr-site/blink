import axios from 'axios'

// 本番環境では相対パス、開発環境ではlocalhost
// VITE_API_URLは /api を含むので、/liff のみ追加
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')

const liffClient = axios.create({
  baseURL: `${API_BASE_URL}/liff`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// リクエスト時にlocalStorageからトークンを取得して設定
liffClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('liff_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 401エラー時にログインページへリダイレクト（元のディープリンクをsessionStorageに退避）
liffClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('liff_token')
      localStorage.removeItem('liff_user')

      // 現在のパス（/liff/home/records/123 など）をsessionStorageに退避し、
      // 再ログイン後に同じ画面へ戻れるようにする
      const fullPath = window.location.pathname
      const liffPath = fullPath.startsWith('/liff') ? fullPath.slice(5) : fullPath
      if (liffPath && liffPath !== '/' && liffPath !== '/home') {
        sessionStorage.setItem('liff_redirect', liffPath)
      }

      if (window.location.pathname !== '/liff/' && window.location.pathname !== '/liff') {
        window.location.href = '/liff/'
      }
    }
    return Promise.reject(error)
  }
)

export default liffClient
