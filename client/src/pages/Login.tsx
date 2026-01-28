import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import logoImage from '../assets/logo.png'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, loginWithGoogle } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      await loginWithGoogle()
      // Googleログインはリダイレクトするため、ここでは何もしない
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="px-5 pt-8 pb-6 text-center">
        <img src={logoImage} alt="Blink" className="h-16 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mt-1">犬の幼稚園・保育園 顧客管理システム</p>
      </header>

      <main className="flex-1 px-5 pb-8">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm max-w-md mx-auto">
          <h2 className="text-lg font-bold font-heading text-center mb-6">スタッフログイン</h2>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Googleログインボタン */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 py-3 px-4 rounded-xl text-sm font-bold border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 mb-6 min-h-[48px]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Googleでログイン
          </button>

          {/* 区切り線 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">または</span>
            </div>
          </div>

          {/* メール・パスワードログインフォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">メールアドレス</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none">
                  <Icon icon="solar:letter-bold" width="20" height="20" />
                </span>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[48px]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">パスワード</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none">
                  <Icon icon="solar:lock-password-bold" width="20" height="20" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[48px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  <Icon icon={showPassword ? 'solar:eye-closed-bold' : 'solar:eye-bold'} 
                    width="20" 
                    height="20" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[48px]"
            >
              {loading ? 'ログイン中...' : 'メールでログイン'}
            </button>
          </form>
        </div>

        <div className="bg-accent/30 rounded-2xl p-4 mt-8 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <span className="text-accent-foreground mt-0.5">
              <Icon icon="solar:info-circle-bold" width="20" height="20" />
            </span>
            <div>
              <p className="text-sm font-bold text-accent-foreground mb-1">ログインについて</p>
              <p className="text-xs text-muted-foreground">
                Googleアカウントまたは管理者から発行されたメールアドレスでログインしてください。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Login
