import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import logoImage from '../assets/logo.png'

function ResetPassword(): JSX.Element {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const fetchStaffInfo = useAuthStore((s) => s.fetchStaffInfo)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        throw updateError
      }

      // セッションを取得してスタッフ情報をロード
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await fetchStaffInfo(session.access_token)
      }

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'パスワードの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="px-5 pt-8 pb-6 text-center">
        <img src={logoImage} alt="Blink" className="h-16 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mt-1">ペットのお店の 予約管理システム</p>
      </header>

      <main className="flex-1 px-5 pb-8">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm max-w-md mx-auto">
          <h2 className="text-lg font-bold font-heading text-center mb-2">
            パスワード再設定
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            新しいパスワードを入力してください
          </p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 新しいパスワード */}
            <div>
              <label className="block text-sm font-medium mb-2">新しいパスワード</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none">
                  <Icon icon="solar:lock-password-bold" width="20" height="20" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8文字以上で入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[48px]"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  <Icon
                    icon={showPassword ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
                    width="20"
                    height="20"
                  />
                </button>
              </div>
            </div>

            {/* パスワード確認 */}
            <div>
              <label className="block text-sm font-medium mb-2">パスワード確認</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none">
                  <Icon icon="solar:lock-password-bold" width="20" height="20" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="もう一度入力してください"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[48px]"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[48px]"
            >
              {loading ? '更新中...' : 'パスワードを更新'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default ResetPassword
