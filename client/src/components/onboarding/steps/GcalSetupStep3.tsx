import { useState, useEffect } from 'react'
import { Icon } from '../../Icon'
import { BTN_PRIMARY, BTN_TERTIARY } from '../../../utils/styles'
import api from '../../../api/client'

interface StepProps {
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function StepHeader({ step, total, progress }: { step: number; total: number; progress: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold">Googleカレンダー連携</p>
        <p className="text-xs text-muted-foreground">Step {step}/{total}</p>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

interface StatusData {
  connected: boolean
  calendarId?: string
  enabled?: boolean
}

export default function GcalSetupStep3({ onBack, onComplete }: StepProps) {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await api.get('/google-calendar/status')
        if (cancelled) return
        setStatus(data)
      } catch (err: unknown) {
        if (cancelled) return
        const axiosErr = err as { response?: { data?: { message?: string } } }
        setError(axiosErr?.response?.data?.message || '接続状態の確認に失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkStatus()

    return () => {
      cancelled = true
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <div>
        <StepHeader step={3} total={3} progress={100} />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="animate-spin size-8 border-3 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-sm font-medium">接続状態を確認しています...</p>
        </div>
      </div>
    )
  }

  // Failure state
  if (error || !status?.connected) {
    return (
      <div>
        <StepHeader step={3} total={3} progress={100} />

        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800 font-medium">接続できませんでした</p>
          <p className="text-xs text-red-600 mt-1">
            {error || 'Googleカレンダーへの接続が確認できませんでした'}
          </p>

          <button
            className={`${BTN_PRIMARY} mt-3 px-5 text-xs`}
            onClick={onBack}
          >
            もう一度試す
          </button>

          <details className="mt-4">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              よくある原因を確認する
            </summary>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1.5 ml-4 list-disc">
              <li>「許可」をクリックせずにウィンドウを閉じた</li>
              <li>ポップアップブロッカーが認証画面をブロックした</li>
              <li>Googleアカウントの組織設定で外部アプリが制限されている</li>
            </ul>
          </details>
        </div>

        <div className="mt-6">
          <button className={`${BTN_TERTIARY} px-4`} onClick={onBack}>
            <Icon icon="solar:arrow-left-linear" className="size-4 mr-1 inline-block" />
            戻る
          </button>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div>
      <StepHeader step={3} total={3} progress={100} />

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon icon="solar:check-circle-bold" className="size-5 text-emerald-600" />
          <p className="text-sm text-emerald-800 font-medium">
            Googleカレンダーに接続しました！
          </p>
        </div>
        {status.calendarId && (
          <p className="text-xs text-emerald-600 mt-1">
            接続先: {status.calendarId}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          予約の作成・変更・削除がGoogleカレンダーに自動で同期されます
        </p>
      </div>

      <button
        className={`${BTN_PRIMARY} w-full mt-8 px-6`}
        onClick={onComplete}
      >
        完了
      </button>
    </div>
  )
}
