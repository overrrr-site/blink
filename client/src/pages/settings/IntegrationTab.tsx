import { useState, useEffect } from 'react'
import { Icon } from '../../components/Icon'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import useSWR from 'swr'
import api from '../../api/client'
import { fetcher } from '../../lib/swr'

interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={`w-14 h-8 rounded-full relative transition-colors min-w-[56px] ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-1 size-6 bg-white rounded-full shadow transition-all ${
        checked ? 'right-1' : 'left-1'
      }`}></span>
    </button>
  )
}

interface GoogleCalendarStatus {
  connected: boolean
  calendarId: string | null
  enabled: boolean
}

interface NotificationSettings {
  reminder_before_visit: boolean
  journal_notification: boolean
  vaccine_alert: boolean
  line_notification_enabled: boolean
  email_notification_enabled: boolean
  line_bot_enabled: boolean
}

interface StoreLineStatus {
  line_connected?: boolean | null
  line_channel_id?: string | null
}

const defaultNotificationSettings: NotificationSettings = {
  reminder_before_visit: true,
  journal_notification: true,
  vaccine_alert: true,
  line_notification_enabled: false,
  email_notification_enabled: false,
  line_bot_enabled: false,
}

function IntegrationTab() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [testingLine, setTestingLine] = useState(false)
  const [lineTestResult, setLineTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [showLineModal, setShowLineModal] = useState(false)
  const [lineSettings, setLineSettings] = useState({
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
  })
  const [savingLine, setSavingLine] = useState(false)

  const {
    data: googleCalendarStatus,
    isLoading: loadingCalendar,
    mutate: mutateGoogleCalendarStatus,
  } = useSWR<GoogleCalendarStatus>('/google-calendar/status', fetcher, { revalidateOnFocus: false })

  const {
    data: notificationSettingsData,
    mutate: mutateNotificationSettings,
  } = useSWR<NotificationSettings>('/notifications/settings', fetcher, { revalidateOnFocus: false })

  const {
    data: storeData,
    isLoading: loadingLine,
    mutate: mutateStore,
  } = useSWR<StoreLineStatus>('/stores', fetcher, { revalidateOnFocus: false })

  const notificationSettings = notificationSettingsData
    ? { ...defaultNotificationSettings, ...notificationSettingsData }
    : defaultNotificationSettings
  const lineStatus = storeData
    ? {
        connected: storeData.line_connected ?? false,
        channelId: storeData.line_channel_id ?? null,
      }
    : null

  useEffect(() => {
    const status = searchParams.get('google_calendar')
    if (status === 'connected') {
      const timer = setTimeout(() => {
        mutateGoogleCalendarStatus()
        navigate('/settings', { replace: true })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, mutateGoogleCalendarStatus, navigate])

  async function handleTestLineMessage() {
    setTestingLine(true)
    setLineTestResult(null)
    try {
      const response = await api.post('/notifications/test-line')
      setLineTestResult({
        success: response.data.success,
        message: response.data.message,
      })
    } catch (error: unknown) {
      const errorData = axios.isAxiosError(error) ? error.response?.data : null
      setLineTestResult({
        success: false,
        message: errorData?.message || 'テスト送信に失敗しました',
      })
    } finally {
      setTestingLine(false)
    }
  }

  async function handleGoogleCalendarConnect() {
    try {
      const response = await api.get('/google-calendar/auth')
      window.location.href = response.data.authUrl
    } catch {
      alert('Googleカレンダー連携の開始に失敗しました')
    }
  }

  async function handleGoogleCalendarDisconnect() {
    if (!confirm('Googleカレンダー連携を解除しますか？')) {
      return
    }

    try {
      await api.post('/google-calendar/disconnect')
      mutateGoogleCalendarStatus(
        { connected: false, calendarId: null, enabled: false },
        { revalidate: false }
      )
      mutateGoogleCalendarStatus()
      alert('Googleカレンダー連携を解除しました')
    } catch {
      alert('連携の解除に失敗しました')
    }
  }

  function handleLineConnect() {
    setLineSettings({
      channelId: '',
      channelSecret: '',
      channelAccessToken: '',
    })
    setShowLineModal(true)
  }

  async function handleLineSave() {
    if (!lineSettings.channelId || !lineSettings.channelSecret || !lineSettings.channelAccessToken) {
      alert('すべての項目を入力してください')
      return
    }

    setSavingLine(true)
    try {
      await api.put('/stores', {
        line_channel_id: lineSettings.channelId,
        line_channel_secret: lineSettings.channelSecret,
        line_channel_access_token: lineSettings.channelAccessToken,
      })
      setShowLineModal(false)
      mutateStore()
      alert('LINE公式アカウント連携を設定しました')
    } catch {
      alert('LINE連携の設定に失敗しました')
    } finally {
      setSavingLine(false)
    }
  }

  async function handleLineDisconnect() {
    if (!confirm('LINE公式アカウント連携を解除しますか？')) {
      return
    }

    try {
      await api.put('/stores', {
        line_channel_id: null,
        line_channel_secret: null,
        line_channel_access_token: null,
      })
      mutateStore()
      alert('LINE公式アカウント連携を解除しました')
    } catch {
      alert('連携の解除に失敗しました')
    }
  }

  async function updateNotificationSetting(key: keyof typeof notificationSettings, value: boolean) {
    const previousSettings = notificationSettings
    mutateNotificationSettings({ ...notificationSettings, [key]: value }, { revalidate: false })
    try {
      await api.put('/notifications/settings', { [key]: value })
      mutateNotificationSettings()
    } catch {
      mutateNotificationSettings(previousSettings, { revalidate: false })
    }
  }

  function closeLineModal() {
    setShowLineModal(false)
    setLineSettings({
      channelId: '',
      channelSecret: '',
      channelAccessToken: '',
    })
  }

  return (
    <>
      {/* Googleカレンダー連携 */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:calendar-bold" width="16" height="16" className="text-primary" />
            Googleカレンダー連携
          </h2>
        </div>
        <div className="p-4">
          {loadingCalendar ? (
            <div className="text-center py-4">
              <span className="text-xs text-muted-foreground">読み込み中...</span>
            </div>
          ) : googleCalendarStatus?.connected ? (
            <div className="space-y-3">
              <div className="bg-chart-2/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-chart-2">連携中</span>
                  <span className="text-xs bg-chart-2/20 text-chart-2 px-2 py-0.5 rounded-full font-bold">
                    有効
                  </span>
                </div>
                <p className="text-sm font-medium">Googleカレンダーと連携中</p>
                {googleCalendarStatus.calendarId && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    カレンダーID: {googleCalendarStatus.calendarId.substring(0, 20)}...
                  </p>
                )}
              </div>
              <button
                onClick={handleGoogleCalendarDisconnect}
                className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-sm font-medium text-destructive"
              >
                <Icon icon="solar:unlink-bold" width="16" height="16" />
                連携を解除
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-sm font-medium mb-1">未連携</p>
                <p className="text-[10px] text-muted-foreground">
                  予約をGoogleカレンダーに自動同期できます
                </p>
              </div>
              <button
                onClick={handleGoogleCalendarConnect}
                className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl transition-colors text-sm font-bold hover:bg-primary/90"
              >
                <Icon icon="solar:calendar-bold" width="16" height="16" />
                Googleカレンダーと連携
              </button>
            </div>
          )}
        </div>
      </section>

      {/* LINE公式アカウント連携 */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:chat-round-bold" width="16" height="16" className="text-primary" />
            LINE公式アカウント連携
          </h2>
        </div>
        <div className="p-4">
          {loadingLine ? (
            <div className="text-center py-4">
              <span className="text-xs text-muted-foreground">読み込み中...</span>
            </div>
          ) : lineStatus?.connected ? (
            <div className="space-y-3">
              <div className="bg-chart-2/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-chart-2">連携中</span>
                  <span className="text-xs bg-chart-2/20 text-chart-2 px-2 py-0.5 rounded-full font-bold">
                    有効
                  </span>
                </div>
                <p className="text-sm font-medium">LINE公式アカウントと連携中</p>
                {lineStatus.channelId && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    チャネルID: {lineStatus.channelId}
                  </p>
                )}
              </div>

              {/* LINE通知有効化スイッチ */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium block">LINE通知を有効にする</span>
                  <span className="text-[10px] text-muted-foreground">オンにするとLINEでメッセージを送信します</span>
                </div>
                <ToggleSwitch
                  checked={notificationSettings.line_notification_enabled}
                  onChange={() => updateNotificationSetting('line_notification_enabled', !notificationSettings.line_notification_enabled)}
                />
              </div>

              {/* テスト送信ボタン */}
              <button
                onClick={handleTestLineMessage}
                disabled={testingLine}
                className="w-full flex items-center justify-center gap-2 p-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors text-sm font-bold disabled:opacity-50"
              >
                {testingLine ? (
                  <>
                    <Icon icon="solar:spinner-bold" width="16" height="16" className="animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:paper-plane-bold" width="16" height="16" />
                    テストメッセージを送信
                  </>
                )}
              </button>

              {/* テスト結果表示 */}
              {lineTestResult && (
                <div className={`rounded-xl p-3 ${
                  lineTestResult.success ? 'bg-chart-2/10 text-chart-2' : 'bg-destructive/10 text-destructive'
                }`}>
                  <div className="flex items-start gap-2">
                    <Icon icon={lineTestResult.success ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
                      width="16"
                      height="16"
                      className="mt-0.5" />
                    <p className="text-sm">{lineTestResult.message}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleLineConnect}
                className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-sm font-medium"
              >
                <Icon icon="solar:settings-bold" width="16" height="16" />
                設定を変更
              </button>
              <button
                onClick={handleLineDisconnect}
                className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-sm font-medium text-destructive"
              >
                <Icon icon="solar:unlink-bold" width="16" height="16" />
                連携を解除
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-sm font-medium mb-1">未連携</p>
                <p className="text-[10px] text-muted-foreground">
                  LINE Messaging APIを使用してメッセージを送信できます
                </p>
              </div>
              <button
                onClick={handleLineConnect}
                className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl transition-colors text-sm font-bold hover:bg-primary/90"
              >
                <Icon icon="solar:chat-round-bold" width="16" height="16" />
                LINE公式アカウントと連携
              </button>
            </div>
          )}
        </div>
      </section>

      {/* LINEチャットボット設定 */}
      {lineStatus?.connected && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:chat-round-dots-bold" width="16" height="16" className="text-primary" />
              LINEチャットボット設定
            </h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Webhook URL表示 */}
            <div className="bg-accent/30 rounded-xl p-3">
              <div className="flex items-start gap-2 mb-2">
                <Icon icon="solar:info-circle-bold" width="16" height="16" className="text-accent-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold mb-1">Webhook URL</p>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    LINE Developersコンソールの「Messaging API設定」→「Webhook URL」に以下のURLを設定してください。
                  </p>
                  <div className="bg-background rounded-lg p-2 border border-border">
                    <code className="text-[10px] text-foreground break-all">
                      {import.meta.env.VITE_FRONTEND_URL || window.location.origin}/api/line/webhook
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      const webhookUrl = `${import.meta.env.VITE_FRONTEND_URL || window.location.origin}/api/line/webhook`;
                      navigator.clipboard.writeText(webhookUrl);
                      alert('Webhook URLをコピーしました');
                    }}
                    className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Icon icon="solar:copy-bold" width="12" height="12" />
                    URLをコピー
                  </button>
                </div>
              </div>
            </div>

            {/* チャットボット有効化スイッチ */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium block">チャットボットを有効にする</span>
                <span className="text-[10px] text-muted-foreground">
                  オンにすると、飼い主がLINEチャットから予約確認・日誌閲覧などができます
                </span>
              </div>
              <ToggleSwitch
                checked={notificationSettings.line_bot_enabled || false}
                onChange={() => updateNotificationSetting('line_bot_enabled', !(notificationSettings.line_bot_enabled || false))}
              />
            </div>

            {/* 使い方ガイド */}
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-xs font-bold mb-2">📖 使い方</p>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <p>• 「予約確認」→ 今後の予約一覧を表示</p>
                <p>• 「予約する」→ 新規予約作成（LIFFアプリを開く）</p>
                <p>• 「キャンセル」→ 予約をキャンセル</p>
                <p>• 「日誌」「日報」→ 日誌一覧を表示</p>
                <p>• 「契約」「残回数」→ 契約情報と残回数を表示</p>
                <p>• 「ヘルプ」→ 使い方ガイドを表示</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 通知設定 */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:bell-bold" width="16" height="16" className="text-chart-5" />
            通知設定
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium block">登園前リマインド</span>
              <span className="text-[10px] text-muted-foreground">前日18:00に飼い主へ通知</span>
            </div>
            <ToggleSwitch
              checked={notificationSettings.reminder_before_visit}
              onChange={() => updateNotificationSetting('reminder_before_visit', !notificationSettings.reminder_before_visit)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium block">日誌送信通知</span>
              <span className="text-[10px] text-muted-foreground">日誌作成時に飼い主へ通知</span>
            </div>
            <ToggleSwitch
              checked={notificationSettings.journal_notification}
              onChange={() => updateNotificationSetting('journal_notification', !notificationSettings.journal_notification)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium block">ワクチン期限アラート</span>
              <span className="text-[10px] text-muted-foreground">期限30日前・14日前に通知</span>
            </div>
            <ToggleSwitch
              checked={notificationSettings.vaccine_alert}
              onChange={() => updateNotificationSetting('vaccine_alert', !notificationSettings.vaccine_alert)}
            />
          </div>
        </div>
      </section>

      {/* LINE公式アカウント連携設定モーダル */}
      {showLineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">LINE公式アカウント連携</h2>
              <button
                onClick={closeLineModal}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-bold" width="24" height="24" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-accent/30 rounded-xl p-3 flex items-start gap-2">
                <Icon icon="solar:info-circle-bold" width="16" height="16" className="text-accent-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  LINE Developersコンソールで取得した、Messaging APIのチャネル情報を入力してください。
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">チャネルID</label>
                <input
                  type="text"
                  value={lineSettings.channelId}
                  onChange={(e) => setLineSettings({ ...lineSettings, channelId: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  確認場所: LINE Developers コンソール → チャネル基本設定
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">チャネルシークレット</label>
                <input
                  type="text"
                  value={lineSettings.channelSecret}
                  onChange={(e) => setLineSettings({ ...lineSettings, channelSecret: e.target.value })}
                  placeholder="abcdefghijklmnopqrstuvwxyz"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  確認場所: LINE Official Account Manager → 設定 → Messaging API
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">チャネルアクセストークン</label>
                <textarea
                  value={lineSettings.channelAccessToken}
                  onChange={(e) => setLineSettings({ ...lineSettings, channelAccessToken: e.target.value })}
                  placeholder="Bearer xxxxx..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  確認場所: LINE Developers コンソール → Messaging API設定 → 一番下の「発行」ボタン
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeLineModal}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleLineSave}
                  disabled={savingLine || !lineSettings.channelId || !lineSettings.channelSecret || !lineSettings.channelAccessToken}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {savingLine ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default IntegrationTab
