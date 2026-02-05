import { Icon } from '@/components/Icon'
import { useNavigate } from 'react-router-dom'
import { getBusinessTypeColors, getBusinessTypeLabel } from '@/utils/businessTypeColors'
import type { RecordType, RecordStatus } from '@/types/record'

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface RecordHeaderProps {
  petName?: string
  recordType: RecordType
  status?: RecordStatus
  saving?: boolean
  autoSaveStatus?: AutoSaveStatus
  onSave: () => void
  onShare: () => void
  onSettings?: () => void
}

export default function RecordHeader({
  petName,
  recordType,
  status,
  saving,
  autoSaveStatus,
  onSave,
  onShare,
  onSettings,
}: RecordHeaderProps) {
  const navigate = useNavigate()
  const colors = getBusinessTypeColors(recordType)
  const label = getBusinessTypeLabel(recordType)

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="size-10 rounded-xl bg-slate-100 flex items-center justify-center"
            aria-label="戻る"
          >
            <Icon icon="solar:alt-arrow-left-linear" width="20" height="20" />
          </button>
          <div>
            <p className="text-base font-bold leading-tight">{petName || '新規カルテ'}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs" style={{ color: colors.primary }}>{label}</p>
              {autoSaveStatus === 'saving' && (
                <span className="text-[10px] text-slate-400">保存中...</span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-[10px] text-emerald-500">✓ 保存済み</span>
              )}
              {autoSaveStatus === 'error' && (
                <span className="text-[10px] text-red-400">保存失敗</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSettings && (
            <button
              onClick={onSettings}
              className="size-10 rounded-xl bg-slate-100 flex items-center justify-center"
              aria-label="設定"
            >
              <Icon icon="solar:settings-linear" width="20" height="20" />
            </button>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 min-h-[40px]"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={onShare}
            disabled={status === 'shared'}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 min-h-[40px]"
            style={{
              background: status === 'shared'
                ? '#94A3B8'
                : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}DD 100%)`,
              boxShadow: status === 'shared' ? 'none' : `0 2px 8px ${colors.primary}40`,
            }}
          >
            {status === 'shared' ? '共有済み' : '共有'}
          </button>
        </div>
      </div>
    </header>
  )
}
