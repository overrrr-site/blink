import { Icon } from '@/components/Icon'
import { useNavigate } from 'react-router-dom'
import { getBusinessTypeColors, getBusinessTypeLabel } from '@/utils/businessTypeColors'
import type { RecordType } from '@/types/record'

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface RecordHeaderProps {
  petName?: string
  recordType: RecordType
  autoSaveStatus?: AutoSaveStatus
  onSettings?: () => void
}

export default function RecordHeader({
  petName,
  recordType,
  autoSaveStatus,
  onSettings,
}: RecordHeaderProps) {
  const navigate = useNavigate()
  const colors = getBusinessTypeColors(recordType)
  const label = getBusinessTypeLabel(recordType)

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-border px-4 py-3 safe-area-pt">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="size-10 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
            aria-label="戻る"
          >
            <Icon icon="solar:alt-arrow-left-linear" width="20" height="20" />
          </button>
          <div>
            <p className="text-base font-bold leading-tight">{petName || '新規カルテ'}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-xs" style={{ color: colors.primary }}>{label}</p>
              {autoSaveStatus === 'saving' && (
                <span className="text-[10px] text-muted-foreground">保存中...</span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-[10px] text-chart-2">✓ 保存済み</span>
              )}
              {autoSaveStatus === 'error' && (
                <span className="text-[10px] text-destructive">保存失敗</span>
              )}
            </div>
          </div>
        </div>

        {onSettings && (
          <button
            onClick={onSettings}
            className="size-10 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
            aria-label="設定"
          >
            <Icon icon="solar:settings-linear" width="20" height="20" />
          </button>
        )}
      </div>
    </header>
  )
}
