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

  const counseling = data.counseling || {
    style_request: '',
    caution_notes: '',
    condition_notes: '',
    consent_confirmed: false,
  }

  const handleCounselingChange = (
    key: 'style_request' | 'caution_notes' | 'condition_notes' | 'consent_confirmed',
    value: string | boolean
  ) => {
    onChange({
      ...data,
      counseling: {
        ...counseling,
        [key]: value,
      },
    })
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
    belly: 'お腹',
    paws: '肉球',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">カット部位を選択</p>

      <DogSilhouette
        selectedParts={data.selectedParts || []}
        onTogglePart={handleTogglePart}
      />

      {/* Part detail inputs */}
      {(data.selectedParts || []).length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground">部位ごとのカット内容</p>
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
                className="flex-1 px-3 py-2 bg-background rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <button
                type="button"
                onClick={() => handleRemovePart(part)}
                className="size-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors shrink-0"
                aria-label={`${PART_LABELS[part] || part}を削除`}
              >
                <Icon icon="solar:close-bold" width="14" height="14" className="text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon icon="solar:clipboard-text-bold" width="16" height="16" className="text-violet-600" />
          <p className="text-sm font-medium text-violet-700">来店時カウンセリング</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">希望スタイル（必須）</label>
          <input
            type="text"
            value={counseling.style_request || ''}
            onChange={(e) => handleCounselingChange('style_request', e.target.value)}
            placeholder="例: 体は6mm、顔は丸く"
            className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">注意事項（任意）</label>
          <textarea
            value={counseling.caution_notes || ''}
            onChange={(e) => handleCounselingChange('caution_notes', e.target.value)}
            rows={2}
            placeholder="例: 耳まわりは敏感、爪切りは短め希望"
            className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">当日の体調確認（必須）</label>
          <textarea
            value={counseling.condition_notes || ''}
            onChange={(e) => handleCounselingChange('condition_notes', e.target.value)}
            rows={2}
            placeholder="例: 食欲あり、皮膚赤みなし、耳汚れ少しあり"
            className="w-full px-3 py-2 bg-white rounded-lg text-sm border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={Boolean(counseling.consent_confirmed)}
            onChange={(e) => handleCounselingChange('consent_confirmed', e.target.checked)}
            className="size-4 accent-violet-600"
          />
          カウンセリング内容を飼い主と確認済み（必須）
        </label>
      </div>
    </div>
  )
}
