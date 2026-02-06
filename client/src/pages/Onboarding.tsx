import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import type { RecordType } from '../types/record'
import { ONBOARDING_BUSINESS_TYPES } from '../domain/businessTypeConfig'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, fetchStaffInfo, session } = useAuthStore()

  const [step, setStep] = useState<'select' | 'primary'>('select')
  const [selectedTypes, setSelectedTypes] = useState<RecordType[]>([])
  const [primaryType, setPrimaryType] = useState<RecordType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 既にオンボーディング完了済みの場合はダッシュボードにリダイレクト
  if (user?.onboardingCompleted !== false) {
    return <Navigate to="/dashboard" replace />
  }

  const toggleType = (type: RecordType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    )
  }

  const handleNext = () => {
    if (selectedTypes.length === 0) {
      setError('業態を1つ以上選択してください')
      return
    }
    setError(null)

    if (selectedTypes.length === 1) {
      // 1つだけ選択された場合はそのまま送信
      handleSubmit(selectedTypes[0])
    } else {
      // 複数選択の場合はメイン業態選択へ
      setStep('primary')
    }
  }

  const handleSubmit = async (primary?: RecordType) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await axios.post('/api/auth/complete-onboarding', {
        businessTypes: selectedTypes,
        primaryBusinessType: primary || primaryType || selectedTypes[0],
      })

      // ユーザー情報を再取得
      if (session?.access_token) {
        await fetchStaffInfo(session.access_token)
      }

      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || '設定の保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Icon icon="solar:settings-bold" width={32} height={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {step === 'select' ? '業態を選択してください' : 'メインの業態を選択'}
          </h1>
          <p className="text-muted-foreground">
            {step === 'select'
              ? 'サービス内容に合わせて1つ以上選択してください'
              : '複数の業態を選択しました。メインで使用する業態を選んでください'}
          </p>
          {user?.name && (
            <p className="mt-2 text-sm text-primary font-medium">
              ようこそ、{user.name}さん
            </p>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <Icon icon="solar:danger-circle-bold" width={20} height={20} />
            {error}
          </div>
        )}

        {/* 業態選択 */}
        {step === 'select' && (
          <div className="space-y-3">
            {ONBOARDING_BUSINESS_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type.value)
              return (
                <button
                  key={type.value}
                  onClick={() => toggleType(type.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div
                    className={`size-12 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    <Icon icon={type.icon} width={24} height={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{type.label}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  <div
                    className={`size-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {isSelected && (
                      <Icon icon="solar:check-circle-bold" width={16} height={16} className="text-primary-foreground" />
                    )}
                  </div>
                </button>
              )
            })}

            <button
              onClick={handleNext}
              disabled={selectedTypes.length === 0 || isSubmitting}
              className="w-full mt-6 py-4 bg-primary text-primary-foreground font-bold rounded-xl
                         hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground
                         transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon icon="solar:refresh-bold" width={20} height={20} className="animate-spin" />
                  設定中...
                </>
              ) : (
                <>
                  次へ
                  <Icon icon="solar:arrow-right-linear" width={20} height={20} />
                </>
              )}
            </button>
          </div>
        )}

        {/* メイン業態選択 */}
        {step === 'primary' && (
          <div className="space-y-3">
            {ONBOARDING_BUSINESS_TYPES.filter((t) => selectedTypes.includes(t.value)).map((type) => {
              const isSelected = primaryType === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => setPrimaryType(type.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div
                    className={`size-12 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    <Icon icon={type.icon} width={24} height={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground">{type.label}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  <div
                    className={`size-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {isSelected && (
                      <Icon icon="solar:check-circle-bold" width={16} height={16} className="text-primary-foreground" />
                    )}
                  </div>
                </button>
              )
            })}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('select')}
                disabled={isSubmitting}
                className="flex-1 py-4 border-2 border-border text-foreground font-bold rounded-xl
                           hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <Icon icon="solar:arrow-left-linear" width={20} height={20} />
                戻る
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={!primaryType || isSubmitting}
                className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-xl
                           hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground
                           transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Icon icon="solar:refresh-bold" width={20} height={20} className="animate-spin" />
                    設定中...
                  </>
                ) : (
                  <>
                    完了
                    <Icon icon="solar:check-circle-bold" width={20} height={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ヒント */}
        <div className="mt-8 p-4 bg-primary/5 rounded-xl">
          <div className="flex items-start gap-3">
            <Icon icon="solar:info-circle-bold" width={20} height={20} className="text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                {step === 'select'
                  ? '複数の業態を選択すると、それぞれに適した記録フォームを使用できます。'
                  : 'メインの業態は、記録の表示名（「カルテ」または「連絡帳」）に影響します。後から設定画面で変更できます。'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
