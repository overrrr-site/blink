import { useState } from 'react'
import axios from 'axios'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ONBOARDING_BUSINESS_TYPES } from '../domain/businessTypeConfig'
import type { RecordType } from '../types/record'
import logoImage from '../assets/logo.png'

function Login(): JSX.Element {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<RecordType[]>([])
  const [primaryType, setPrimaryType] = useState<RecordType | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const toggleType = (type: RecordType) => {
    setSelectedTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      // メイン業態が選択解除されたらリセット
      if (primaryType && !next.includes(primaryType)) {
        setPrimaryType(null)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        if (selectedTypes.length === 0) {
          setError('業態を1つ以上選択してください')
          setLoading(false)
          return
        }
        const primary = selectedTypes.length > 1 && primaryType
          ? primaryType
          : selectedTypes[0]
        await register({
          storeName,
          ownerName,
          email,
          password,
          businessTypes: selectedTypes,
          primaryBusinessType: primary,
        })
        navigate('/dashboard')
      } else {
        await login(email, password)
        navigate('/dashboard')
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'エラーが発生しました')
      } else {
        setError(err instanceof Error ? err.message : 'エラーが発生しました')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  const isRegister = mode === 'register'

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <header className="px-5 pt-8 pb-6 text-center">
        <img src={logoImage} alt="Blink" className="h-16 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mt-1">犬の幼稚園・保育園 顧客管理システム</p>
      </header>

      <main className="flex-1 px-5 pb-8">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm max-w-md mx-auto">
          <h2 className="text-lg font-bold font-heading text-center mb-6">
            {isRegister ? '新規店舗登録' : 'スタッフログイン'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 登録モード: 店舗名・お名前 */}
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">店舗名</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none">
                      <Icon icon="solar:shop-bold" width="20" height="20" />
                    </span>
                    <input
                      type="text"
                      placeholder="店舗名を入力"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[48px]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">お名前</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none">
                      <Icon icon="solar:user-bold" width="20" height="20" />
                    </span>
                    <input
                      type="text"
                      placeholder="管理者のお名前"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[48px]"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* メールアドレス */}
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

            {/* パスワード */}
            <div>
              <label className="block text-sm font-medium mb-2">パスワード</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none">
                  <Icon icon="solar:lock-password-bold" width="20" height="20" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isRegister ? '8文字以上で入力' : 'パスワードを入力'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[48px]"
                  required
                  minLength={isRegister ? 8 : undefined}
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

            {/* 登録モード: 業態選択 */}
            {isRegister && (
              <div>
                <label className="block text-sm font-medium mb-2">業態を選択してください</label>
                <div className="space-y-2">
                  {ONBOARDING_BUSINESS_TYPES.map((type) => {
                    const isSelected = selectedTypes.includes(type.value)
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleType(type.value)}
                        className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        <div
                          className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          <Icon icon={type.icon} width={20} height={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                        <div
                          className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {isSelected && (
                            <Icon icon="solar:check-circle-bold" width={14} height={14} className="text-primary-foreground" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* 2つ以上選択時: メイン業態選択 */}
                {selectedTypes.length > 1 && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      メインの業態を選択
                    </label>
                    <div className="flex gap-2">
                      {ONBOARDING_BUSINESS_TYPES
                        .filter((t) => selectedTypes.includes(t.value))
                        .map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setPrimaryType(type.value)}
                            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                              primaryType === type.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/30'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading || (isRegister && selectedTypes.length === 0) || (isRegister && selectedTypes.length > 1 && !primaryType)}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[48px]"
            >
              {loading
                ? (isRegister ? '登録中...' : 'ログイン中...')
                : (isRegister ? '登録する' : 'ログイン')
              }
            </button>
          </form>

          {/* モード切り替え */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isRegister
                ? 'アカウントをお持ちの方はログイン'
                : '新しい店舗を登録する'
              }
            </button>
          </div>
        </div>

        <div className="bg-accent/30 rounded-2xl p-4 mt-8 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <span className="text-accent-foreground mt-0.5">
              <Icon icon="solar:info-circle-bold" width="20" height="20" />
            </span>
            <div>
              <p className="text-sm font-bold text-accent-foreground mb-1">
                {isRegister ? '新規登録について' : 'ログインについて'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRegister
                  ? '新しい店舗アカウントを作成します。登録後すぐにご利用いただけます。'
                  : '管理者から発行されたメールアドレスでログインしてください。'
                }
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Login
