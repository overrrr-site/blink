import { Icon } from '@/components/Icon'
import type { GroomingData } from '@/types/record'
import DogSilhouette from './DogSilhouette'

const GROOMING_COLOR = '#8B5CF6'

interface GroomingFormProps {
  data: GroomingData
  onChange: (data: GroomingData) => void
}

export default function GroomingForm({ data, onChange }: GroomingFormProps) {
  const handleTogglePart = (part: string) => {
    const parts = data.selectedParts || []
    const next = parts.includes(part)
      ? parts.filter((p) => p !== part)
      : [...parts, part]
    // Remove notes for deselected parts
    const nextNotes = { ...data.partNotes }
    if (parts.includes(part) && !next.includes(part)) {
      delete nextNotes[part]
    }
    onChange({ ...data, selectedParts: next, partNotes: nextNotes })
  }

  const handlePartNote = (part: string, value: string) => {
    onChange({
      ...data,
      partNotes: { ...data.partNotes, [part]: value },
    })
  }

  const handleRemovePart = (part: string) => {
    const nextParts = (data.selectedParts || []).filter((p) => p !== part)
    const nextNotes = { ...data.partNotes }
    delete nextNotes[part]
    onChange({ ...data, selectedParts: nextParts, partNotes: nextNotes })
  }

  const PART_LABELS: Record<string, string> = {
    head: '頭',
    face: '顔',
    ears: '耳',
    body: '体',
    tail: 'しっぽ',
    front_legs: '前足',
    back_legs: '後足',
    hip: 'お尻',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-700">カット部位を選択</p>

      <DogSilhouette
        selectedParts={data.selectedParts || []}
        onTogglePart={handleTogglePart}
      />

      {/* Part detail inputs */}
      {(data.selectedParts || []).length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-slate-500">部位ごとのカット内容</p>
          {(data.selectedParts || []).map((part) => (
            <div key={part} className="flex items-center gap-2">
              <span
                className="text-xs font-bold text-center rounded-lg shrink-0"
                style={{
                  width: 56,
                  padding: '6px 0',
                  background: GROOMING_COLOR,
                  color: '#FFFFFF',
                }}
              >
                {PART_LABELS[part] || part}
              </span>
              <input
                type="text"
                value={data.partNotes?.[part] || ''}
                onChange={(e) => handlePartNote(part, e.target.value)}
                placeholder="10mm、テディベアなど"
                className="flex-1 px-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <button
                type="button"
                onClick={() => handleRemovePart(part)}
                className="size-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0"
                aria-label={`${PART_LABELS[part] || part}を削除`}
              >
                <Icon icon="solar:close-bold" width="14" height="14" className="text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
