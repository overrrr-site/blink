import { Icon } from '@/components/Icon'
import { getBusinessTypeColors } from '@/utils/businessTypeColors'
import type { RecordType } from '@/types/record'

interface PetInfoCardProps {
  petName: string
  breed?: string
  age?: string
  photoUrl?: string | null
  recordType: RecordType
  onCopyPrevious?: () => void
  copyLoading?: boolean
}

export default function PetInfoCard({
  petName,
  breed,
  age,
  photoUrl,
  recordType,
  onCopyPrevious,
  copyLoading,
}: PetInfoCardProps) {
  const colors = getBusinessTypeColors(recordType)

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="size-14 rounded-full p-0.5"
          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.light})` }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={petName}
              className="size-full rounded-full object-cover border-2 border-white"
            />
          ) : (
            <div className="size-full rounded-full bg-white flex items-center justify-center">
              <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">{petName}</h2>
          <p className="text-xs text-muted-foreground">
            {[breed, age].filter(Boolean).join(' / ')}
          </p>
        </div>
        {onCopyPrevious && (
          <button
            onClick={onCopyPrevious}
            disabled={copyLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border hover:bg-background transition-colors disabled:opacity-50 min-h-[36px]"
          >
            <Icon icon="solar:copy-linear" width="16" height="16" />
            {copyLoading ? '読込中...' : '前回コピー'}
          </button>
        )}
      </div>
    </div>
  )
}
