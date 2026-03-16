import { useState } from 'react'
import { Icon } from '../../Icon'
import { BTN_PRIMARY, BTN_TERTIARY, INPUT_CLASS } from '../../../utils/styles'
import { useToast } from '../../Toast'
import api from '../../../api/client'

interface StepProps {
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function StepHeader({ step }: { step: number }) {
  const percent = Math.round((step / 4) * 100)
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-foreground">
          LINE連携セットアップ
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          Step {step}/4
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

export default function LineSetupStep3({ onNext, onBack }: StepProps) {
  const { showToast } = useToast()
  const [channelId, setChannelId] = useState('')
  const [channelSecret, setChannelSecret] = useState('')
  const [channelAccessToken, setChannelAccessToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [showScreenshot, setShowScreenshot] = useState(false)

  const isValid =
    channelId.trim() !== '' &&
    /^\d+$/.test(channelId.trim()) &&
    channelSecret.trim() !== '' &&
    channelAccessToken.trim() !== ''

  async function handleNext() {
    if (!isValid) return
    setSaving(true)
    try {
      await api.put('/stores', {
        line_channel_id: channelId.trim(),
        line_channel_secret: channelSecret.trim(),
        line_channel_access_token: channelAccessToken.trim(),
      })
      onNext()
    } catch {
      showToast('設定の保存に失敗しました。入力内容を確認してください。', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="px-1 py-2 flex-1">
        <StepHeader step={2} />

        <h3 className="text-base font-bold text-foreground mb-1">
          Messaging APIチャネル情報の入力
        </h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          LINE Developersの「Messaging API」チャネルから以下の情報を入力してください。
        </p>

        <div className="space-y-4 mb-4">
          {/* Channel ID */}
          <div>
            <label
              htmlFor="channel-id"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              チャネルID
            </label>
            <input
              id="channel-id"
              type="text"
              inputMode="numeric"
              className={INPUT_CLASS}
              placeholder="例: 1234567890"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            />
            {channelId.trim() !== '' && !/^\d+$/.test(channelId.trim()) && (
              <p className="text-xs text-red-500 mt-1">
                チャネルIDは数字のみで入力してください
              </p>
            )}
          </div>

          {/* Channel Secret */}
          <div>
            <label
              htmlFor="channel-secret"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              チャネルシークレット
            </label>
            <input
              id="channel-secret"
              type="password"
              className={INPUT_CLASS}
              placeholder="チャネルシークレットを入力"
              value={channelSecret}
              onChange={(e) => setChannelSecret(e.target.value)}
            />
          </div>

          {/* Channel Access Token */}
          <div>
            <label
              htmlFor="channel-access-token"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              チャネルアクセストークン（長期）
            </label>
            <textarea
              id="channel-access-token"
              className={`${INPUT_CLASS} resize-none`}
              rows={3}
              placeholder="チャネルアクセストークンを入力"
              value={channelAccessToken}
              onChange={(e) => setChannelAccessToken(e.target.value)}
            />
          </div>
        </div>

        {/* Collapsible screenshot hint */}
        <button
          type="button"
          onClick={() => setShowScreenshot((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-primary mb-3"
        >
          <Icon icon="solar:info-circle-linear" className="size-4" />
          <span className="font-medium">どこに書いてある？</span>
          <Icon
            icon={showScreenshot ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear'}
            className="size-3.5"
          />
        </button>

        {showScreenshot && (
          <div className="rounded-xl border border-border bg-card p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              LINE Developersコンソールの「チャネル基本設定」と「Messaging API設定」タブで確認できます。
            </p>
            <div className="bg-muted rounded-lg h-48 flex items-center justify-center text-sm text-muted-foreground">
              スクリーンショット（後で差し替え）
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
        <button
          type="button"
          className={`${BTN_PRIMARY} px-6 flex items-center gap-1`}
          disabled={!isValid || saving}
          onClick={handleNext}
        >
          {saving ? (
            <>
              <Icon
                icon="solar:spinner-bold"
                className="size-4 animate-spin"
              />
              保存中...
            </>
          ) : (
            <>
              次へ
              <Icon icon="solar:arrow-right-linear" className="size-4" />
            </>
          )}
        </button>
      </div>
    </>
  )
}
