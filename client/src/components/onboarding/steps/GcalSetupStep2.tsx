import { useState, useEffect } from 'react'
import { Icon } from '../../Icon'
import { BTN_PRIMARY, BTN_TERTIARY } from '../../../utils/styles'
import { useToast } from '../../Toast'
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

export default function GcalSetupStep2({ onNext, onBack }: StepProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false)

  // On mount, check if returning from OAuth redirect
  useEffect(() => {
    const wizardActive = sessionStorage.getItem('gcal_wizard_active')
    if (!wizardActive) return

    let cancelled = false

    async function checkConnection() {
      setWaiting(true)
      try {
        const { data } = await api.get('/google-calendar/status')
        if (cancelled) return

        if (data.connected) {
          sessionStorage.removeItem('gcal_wizard_active')
          onNext()
        } else {
          // Not connected - show pre-OAuth state with retry option
          setWaiting(false)
          sessionStorage.removeItem('gcal_wizard_active')
        }
      } catch {
        if (cancelled) return
        setWaiting(false)
        sessionStorage.removeItem('gcal_wizard_active')
      }
    }

    checkConnection()

    return () => {
      cancelled = true
    }
  }, [onNext])

  async function handleConnect() {
    setLoading(true)
    try {
      const { data } = await api.get('/google-calendar/auth')
      sessionStorage.setItem('gcal_wizard_active', 'true')
      window.location.href = data.authUrl
    } catch {
      setLoading(false)
      showToast('認証URLの取得に失敗しました', 'error')
    }
  }

  // Waiting state (after OAuth redirect initiated)
  if (waiting) {
    return (
      <div>
        <StepHeader step={2} total={3} progress={66} />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="animate-spin size-8 border-3 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-sm font-medium mb-1">
            Googleの認証画面を確認してください
          </p>
          <p className="text-xs text-muted-foreground">
            別ウィンドウで開いているGoogleの画面で「許可」をクリックすると、ここに戻ります
          </p>
        </div>
      </div>
    )
  }

  // Pre-OAuth state
  return (
    <div>
      <StepHeader step={2} total={3} progress={66} />

      {/* Explanation box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-blue-800 font-medium mb-2">
          これから起きること
        </p>
        <ol className="text-xs text-blue-700 space-y-1.5 ml-4 list-decimal">
          <li>Googleのログイン画面が開きます</li>
          <li>使用するGoogleアカウントでログインしてください</li>
          <li>「許可」をクリックしてください</li>
          <li>自動的にこの画面に戻ります</li>
        </ol>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 mt-8">
        <button className={`${BTN_TERTIARY} px-4`} onClick={onBack}>
          <Icon icon="solar:arrow-left-linear" className="size-4 mr-1 inline-block" />
          戻る
        </button>
        <button
          className={`${BTN_PRIMARY} px-6`}
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <>
              <Icon icon="mdi:loading" className="size-4 mr-1 inline-block animate-spin" />
              接続中...
            </>
          ) : (
            <>
              Googleに接続する
              <Icon icon="solar:arrow-right-linear" className="size-4 ml-1 inline-block" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
