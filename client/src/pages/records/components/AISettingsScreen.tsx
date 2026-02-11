import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'

const AI_COLOR = '#6366F1'

interface AISettings {
  aiAssistantEnabled: boolean
  storeDataContribution: boolean
  serviceImprovement: boolean
}

interface AISettingsScreenProps {
  open: boolean
  onClose: () => void
  initialSettings?: Partial<AISettings>
  onSave?: (settings: AISettings) => void
}

export default function AISettingsScreen({
  open,
  onClose,
  initialSettings,
  onSave,
}: AISettingsScreenProps) {
  const [settings, setSettings] = useState<AISettings>({
    aiAssistantEnabled: initialSettings?.aiAssistantEnabled ?? true,
    storeDataContribution: initialSettings?.storeDataContribution ?? true,
    serviceImprovement: initialSettings?.serviceImprovement ?? false,
  })

  useEffect(() => {
    if (!open) return
    setSettings({
      aiAssistantEnabled: initialSettings?.aiAssistantEnabled ?? true,
      storeDataContribution: initialSettings?.storeDataContribution ?? true,
      serviceImprovement: initialSettings?.serviceImprovement ?? false,
    })
  }, [open, initialSettings?.aiAssistantEnabled, initialSettings?.storeDataContribution, initialSettings?.serviceImprovement])

  if (!open) return null

  const handleToggle = (key: keyof AISettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    onSave?.(settings)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-xl"
        style={{ maxHeight: '85vh' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="size-9 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${AI_COLOR}, ${AI_COLOR}CC)`,
                boxShadow: `0 2px 8px ${AI_COLOR}40`,
              }}
            >
              <Icon icon="solar:magic-stick-3-bold" width="20" height="20" className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">AI設定</h2>
              <p className="text-xs text-muted-foreground">AIアシスタントの設定を管理</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="閉じる"
          >
            <Icon icon="solar:close-bold" width="18" height="18" className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6 space-y-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {/* AI Assistant Toggle */}
          <SettingItem
            icon="solar:magic-stick-3-bold"
            title="AIアシスタント"
            description="カルテ作成時にAIがレポート下書きやサジェスションを提供します"
            enabled={settings.aiAssistantEnabled}
            onToggle={() => handleToggle('aiAssistantEnabled')}
          />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Data contribution section */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-3 tracking-wider">データ活用設定</p>

            <div className="space-y-3">
              <SettingItem
                icon="solar:shop-2-bold"
                title="店舗AI改善への提供"
                description="カルテデータを店舗のAI精度向上に活用します。データは店舗内でのみ使用されます"
                enabled={settings.storeDataContribution}
                onToggle={() => handleToggle('storeDataContribution')}
                disabled={!settings.aiAssistantEnabled}
              />

              <SettingItem
                icon="solar:global-bold"
                title="サービス全体改善への貢献"
                description="匿名化されたデータをサービス全体のAI改善に活用します。個人情報は含まれません"
                enabled={settings.serviceImprovement}
                onToggle={() => handleToggle('serviceImprovement')}
                disabled={!settings.aiAssistantEnabled}
              />
            </div>
          </div>

          {/* Info box */}
          <div
            className="rounded-xl p-3.5 flex items-start gap-2.5"
            style={{ background: '#EEF2FF' }}
          >
            <div className="shrink-0 mt-px" style={{ color: AI_COLOR }}>
              <Icon icon="solar:info-circle-bold" width="18" height="18" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AIアシスタントを無効にしても、既存のカルテデータには影響しません。
              データ活用設定はいつでも変更できます。
            </p>
          </div>

          <div className="rounded-xl border border-border bg-white p-3.5">
            <p className="text-xs font-bold text-muted-foreground mb-1">使用しない範囲</p>
            <ul className="text-xs text-muted-foreground leading-relaxed">
              <li>外部AI（OpenAI等）のモデル学習</li>
              <li>第三者への提供・販売</li>
              <li>広告・マーケティング目的</li>
            </ul>
          </div>
        </div>

        {/* Footer - セーフエリア対応 */}
        <div
          className="px-5 pt-2 border-t border-border flex gap-3"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-muted text-muted-foreground hover:bg-secondary transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${AI_COLOR}, ${AI_COLOR}CC)`,
              boxShadow: `0 2px 8px ${AI_COLOR}40`,
            }}
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingItem({
  icon,
  title,
  description,
  enabled,
  onToggle,
  disabled = false,
}: {
  icon: string
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
      className={`w-full text-left flex items-start gap-3 rounded-xl p-3 transition-colors ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div
        className="size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: enabled && !disabled ? `${AI_COLOR}15` : 'hsl(var(--muted))' }}
      >
        <div style={enabled && !disabled ? { color: AI_COLOR } : undefined}>
          <Icon
            icon={icon}
            width="18"
            height="18"
            className={enabled && !disabled ? undefined : 'text-muted-foreground'}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <span
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          background: enabled && !disabled ? AI_COLOR : '#D1D5DB',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow-sm transition-transform"
          style={{
            transform: enabled ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </span>
    </button>
  )
}
