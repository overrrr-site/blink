import { useState } from 'react'
import { Icon } from '../../Icon'
import { BTN_PRIMARY, BTN_SECONDARY, BTN_TERTIARY } from '../../../utils/styles'
import api from '../../../api/client'

interface StepProps {
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function StepHeader({ step }: { step: number }) {
  const percent = Math.round((step / 5) * 100)
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-foreground">
          LINE連携セットアップ
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          Step {step}/5
        </p>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

type TestStatus = 'idle' | 'loading' | 'success' | 'error'

export default function LineSetupStep5({ onBack, onComplete }: StepProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)

  async function runTest() {
    setTestStatus('loading')
    setErrorMessage('')
    setShowTroubleshooting(false)

    try {
      // First check if credentials exist
      const statusRes = await api.get('/notifications/line-status')
      const statusData = statusRes.data as {
        hasLineCredentials: boolean
        lineNotificationEnabled: boolean
      }

      if (!statusData.hasLineCredentials) {
        setTestStatus('error')
        setErrorMessage(
          'LINE APIの認証情報が見つかりません。Step 3で入力した情報を確認してください。'
        )
        return
      }

      // Run the actual test
      const testRes = await api.post('/notifications/test-line')
      const testData = testRes.data as { success?: boolean; error?: string }

      if (testData.success) {
        setTestStatus('success')
      } else {
        setTestStatus('error')
        setErrorMessage(
          testData.error || 'テストメッセージの送信に失敗しました。'
        )
      }
    } catch {
      setTestStatus('error')
      setErrorMessage(
        '接続テストに失敗しました。ネットワーク接続と設定内容を確認してください。'
      )
    }
  }

  return (
    <>
      <div className="px-1 py-2 flex-1">
        <StepHeader step={5} />

        <h3 className="text-base font-bold text-foreground mb-1">
          接続テスト
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          LINE連携が正しく設定されているか確認します。
        </p>

        {/* Test button (idle or loading) */}
        {(testStatus === 'idle' || testStatus === 'loading') && (
          <button
            type="button"
            className={`${BTN_PRIMARY} w-full px-6 flex items-center justify-center gap-2`}
            disabled={testStatus === 'loading'}
            onClick={runTest}
          >
            {testStatus === 'loading' ? (
              <>
                <Icon
                  icon="solar:spinner-bold"
                  className="size-5 animate-spin"
                />
                テスト実行中...
              </>
            ) : (
              <>
                <Icon icon="solar:play-bold" className="size-5" />
                接続テストを実行
              </>
            )}
          </button>
        )}

        {/* Success state */}
        {testStatus === 'success' && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Icon
                  icon="solar:check-circle-bold"
                  className="size-6 text-emerald-600"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800 mb-1">
                  接続テスト成功
                </p>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  LINE連携が正常に設定されました。テストメッセージがLINE公式アカウントに送信されました。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {testStatus === 'error' && (
          <div className="space-y-4 mb-6">
            <div className="rounded-xl bg-red-50 border border-red-200 p-5">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Icon
                    icon="solar:close-circle-bold"
                    className="size-6 text-red-600"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-800 mb-1">
                    接続テスト失敗
                  </p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <button
              type="button"
              onClick={() => setShowTroubleshooting((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-primary"
            >
              <Icon icon="solar:info-circle-linear" className="size-4" />
              <span className="font-medium">よくある原因</span>
              <Icon
                icon={
                  showTroubleshooting
                    ? 'solar:arrow-up-linear'
                    : 'solar:arrow-down-linear'
                }
                className="size-3.5"
              />
            </button>

            {showTroubleshooting && (
              <div className="rounded-xl border border-border bg-card p-4">
                <ul className="text-sm text-foreground space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">1.</span>
                    チャネルアクセストークンが正しくコピーされていない
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">2.</span>
                    チャネルシークレットが間違っている
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">3.</span>
                    Webhook URLが正しく設定されていない
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">4.</span>
                    Messaging APIチャネルではなくLINEログインチャネルの情報を入力している
                  </li>
                </ul>
              </div>
            )}

            {/* Retry / Go back */}
            <div className="flex gap-3">
              <button
                type="button"
                className={`${BTN_SECONDARY} flex-1 px-4 flex items-center justify-center gap-1`}
                onClick={() => onBack()}
              >
                設定を見直す
              </button>
              <button
                type="button"
                className={`${BTN_PRIMARY} flex-1 px-4 flex items-center justify-center gap-1`}
                onClick={runTest}
              >
                もう一度試す
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-1 py-3 border-t border-border">
        <button
          type="button"
          className={`${BTN_TERTIARY} px-4 flex items-center gap-1`}
          onClick={onBack}
        >
          <Icon icon="solar:arrow-left-linear" className="size-4" />
          戻る
        </button>
        {testStatus === 'success' ? (
          <button
            type="button"
            className={`${BTN_PRIMARY} px-6`}
            onClick={onComplete}
          >
            完了
            <Icon icon="solar:check-circle-bold" className="size-4 ml-1 inline-block" />
          </button>
        ) : (
          <div className="min-w-[48px]" />
        )}
      </div>
    </>
  )
}
