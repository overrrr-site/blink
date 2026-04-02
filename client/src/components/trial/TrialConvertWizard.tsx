import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { INPUT_CLASS, BTN_PRIMARY, BTN_SECONDARY } from '../../utils/styles'

interface DeletedCounts {
  owners: number
  dogs: number
  reservations: number
  records: number
}

export function TrialConvertWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [hasLineAccount, setHasLineAccount] = useState<boolean | null>(null)
  const [lineConfig, setLineConfig] = useState({
    line_channel_id: '',
    line_channel_secret: '',
    line_channel_access_token: '',
  })
  const [connectionTestResult, setConnectionTestResult] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [, setDeletedCounts] = useState<DeletedCounts | null>(null)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')

  const handleConnectionTest = async () => {
    setConnectionTestResult('testing')
    setError('')
    try {
      const response = await fetch('https://api.line.me/v2/bot/info', {
        headers: {
          'Authorization': `Bearer ${lineConfig.line_channel_access_token}`,
        },
      })
      if (response.ok) {
        setConnectionTestResult('success')
      } else {
        setConnectionTestResult('error')
        setError('LINE接続テストに失敗しました。認証情報を確認してください。')
      }
    } catch {
      setConnectionTestResult('error')
      setError('接続エラーが発生しました。')
    }
  }

  const handleConvert = async () => {
    setConverting(true)
    setError('')
    try {
      const { data } = await api.post('/trial/convert', {
        ...lineConfig,
        confirm_delete_all: true,
      })
      if (data.success) {
        setDeletedCounts(data.data.deleted_counts)
        setStep(5)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || '切り替えに失敗しました')
    } finally {
      setConverting(false)
    }
  }

  const isLineConfigValid = lineConfig.line_channel_id && lineConfig.line_channel_secret && lineConfig.line_channel_access_token

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header with step indicator */}
      <div className="space-y-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground">
          ← 戻る
        </button>
        <h1 className="text-xl font-bold text-foreground">本契約に切り替える</h1>
        <p className="text-sm text-muted-foreground">
          トライアルではBlink社のLINE公式アカウントを使って体験いただきました。
          本契約では、お店専用のLINE公式アカウントに切り替えることで、
          飼い主さんに直接お店の名前でメッセージを届けられるようになります。
        </p>

        {/* Step progress */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: LINE Account Check */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold">Step 1: LINE公式アカウントの準備</h2>
          <p className="text-sm text-muted-foreground">
            お店専用のLINE公式アカウントが必要です。
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setHasLineAccount(true); setStep(2) }}
              className={`w-full ${BTN_PRIMARY} px-4 py-3`}
            >
              LINE公式アカウントを持っています
            </button>
            <button
              onClick={() => setHasLineAccount(false)}
              className={`w-full ${BTN_SECONDARY} px-4 py-3`}
            >
              まだ持っていません
            </button>
          </div>
          {hasLineAccount === false && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <p className="text-sm font-medium text-blue-800">LINE公式アカウントの作成手順</p>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>LINE for Businessにアクセス</li>
                <li>「アカウントを作成」をクリック</li>
                <li>必要情報を入力して作成</li>
                <li>Messaging APIを有効化</li>
              </ol>
              <a
                href="https://www.linebiz.com/jp/entry/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 underline"
              >
                LINE for Businessを開く →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Step 2: LINE Credentials Input */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold">Step 2: LINE設定の入力</h2>
          <p className="text-sm text-muted-foreground">
            LINE Developersコンソールから、Messaging APIチャネルの情報を入力してください。
          </p>
          <a
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            LINE Developersコンソールを開く →
          </a>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">チャネルID</label>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="1234567890"
                value={lineConfig.line_channel_id}
                onChange={e => setLineConfig(prev => ({ ...prev, line_channel_id: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                確認場所: LINE Developers → Messaging APIチャネル → チャネル基本設定
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">チャネルシークレット</label>
              <input
                type="password"
                className={INPUT_CLASS}
                placeholder="英数字の文字列"
                value={lineConfig.line_channel_secret}
                onChange={e => setLineConfig(prev => ({ ...prev, line_channel_secret: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                確認場所: LINE Developers → Messaging APIチャネル → チャネル基本設定
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">チャネルアクセストークン（長期）</label>
              <input
                type="password"
                className={INPUT_CLASS}
                placeholder="長い文字列..."
                value={lineConfig.line_channel_access_token}
                onChange={e => setLineConfig(prev => ({ ...prev, line_channel_access_token: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                確認場所: LINE Developers → Messaging API設定 →「チャネルアクセストークン（長期）」の「発行」ボタン
              </p>
            </div>
          </div>

          {/* Connection test */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleConnectionTest}
              disabled={!isLineConfigValid || connectionTestResult === 'testing'}
              className={`${BTN_SECONDARY} px-4 py-2 text-xs`}
            >
              {connectionTestResult === 'testing' ? '接続テスト中...' : '接続テスト'}
            </button>
            {connectionTestResult === 'success' && (
              <span className="text-sm text-green-600 font-medium">接続成功</span>
            )}
            {connectionTestResult === 'error' && (
              <span className="text-sm text-red-600 font-medium">接続失敗</span>
            )}
          </div>

          <button
            onClick={() => setStep(3)}
            disabled={!isLineConfigValid}
            className={`w-full ${BTN_PRIMARY} px-4 py-3`}
          >
            次へ →
          </button>
        </div>
      )}

      {/* Step 3: Data Deletion Confirmation */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold">Step 3: トライアルデータの削除確認</h2>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <p className="text-sm font-medium text-amber-800">
              本契約に切り替えると、トライアル中に登録した顧客データがすべて削除されます。
            </p>
            <p className="text-xs text-amber-700">
              店舗設定（営業時間、コース、メニューなど）は保持されます。
              本契約後は、実際の飼い主さんの情報を改めて登録していただきます。
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer min-h-[48px]">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={e => setConfirmChecked(e.target.checked)}
              className="mt-1 w-5 h-5 rounded accent-primary"
            />
            <span className="text-sm text-foreground">上記を確認し、データ削除に同意します</span>
          </label>

          <button
            onClick={() => setStep(4)}
            disabled={!confirmChecked}
            className={`w-full ${BTN_PRIMARY} px-4 py-3`}
          >
            次へ →
          </button>
        </div>
      )}

      {/* Step 4: Conversion Execution */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold">Step 4: 切り替え実行</h2>
          <p className="text-sm text-muted-foreground">
            「切り替える」ボタンを押すと、LINE設定の更新とトライアルデータの削除が実行されます。
          </p>
          <button
            onClick={handleConvert}
            disabled={converting}
            className={`w-full ${BTN_PRIMARY} px-4 py-3`}
          >
            {converting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                切り替え中...
              </span>
            ) : '切り替える'}
          </button>
        </div>
      )}

      {/* Step 5: Completion */}
      {step === 5 && (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">本契約への切り替えが完了しました</h2>
            <p className="text-sm text-muted-foreground">
              お店専用のLINE公式アカウントが設定されました。
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-left space-y-2">
            <p className="text-sm font-medium text-blue-800">Webhook URLの設定</p>
            <p className="text-xs text-blue-700">
              LINE Developers ConsoleでWebhook URLを以下に設定してください：
            </p>
            <code className="block text-xs bg-blue-100 px-3 py-2 rounded-lg break-all">
              {window.location.origin}/api/line/webhook
            </code>
          </div>

          <button
            onClick={() => {
              window.location.href = '/dashboard'
            }}
            className={`w-full ${BTN_PRIMARY} px-4 py-3`}
          >
            ダッシュボードへ
          </button>
        </div>
      )}
    </div>
  )
}
