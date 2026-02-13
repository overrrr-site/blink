import type { RecordType } from '@/types/record'
import { BTN_PRIMARY, BTN_SECONDARY } from '@/utils/styles'
import { getBusinessTypeColors } from '@/utils/businessTypeColors'

interface RecordSaveFooterProps {
  mode: 'create' | 'detail'
  recordType: RecordType
  saving: boolean
  onSave: () => void
  onShare: () => void
  shareDisabled?: boolean
  shareLabel: string
}

export default function RecordSaveFooter({
  mode,
  recordType,
  saving,
  onSave,
  onShare,
  shareDisabled = false,
  shareLabel,
}: RecordSaveFooterProps) {
  const isShared = shareLabel === '共有済み'
  const primaryColor = getBusinessTypeColors(recordType).primary
  const containerClass = mode === 'create'
    ? 'fixed bottom-[72px] inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-pb shadow-[0_-4px_16px_rgba(0,0,0,0.08)]'
    : 'fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-pb'

  return (
    <div className={containerClass}>
      <div className="flex gap-3 max-w-lg mx-auto">
        <button
          onClick={onSave}
          disabled={saving}
          className={`flex-1 ${BTN_SECONDARY}`}
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          onClick={onShare}
          disabled={saving || shareDisabled}
          className={`flex-1 ${BTN_PRIMARY}`}
          style={{
            background: isShared
              ? '#94A3B8'
              : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}DD 100%)`,
            boxShadow: isShared ? 'none' : `0 2px 8px ${primaryColor}40`,
          }}
        >
          {shareLabel}
        </button>
      </div>
    </div>
  )
}
