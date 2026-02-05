import type { ConditionData, ConditionLevel } from '@/types/record'

const CONDITIONS: Array<{ value: ConditionLevel; label: string; emoji: string }> = [
  { value: 'excellent', label: '絶好調', emoji: '😆' },
  { value: 'good', label: '元気', emoji: '😊' },
  { value: 'normal', label: '普通', emoji: '😐' },
  { value: 'tired', label: '疲れ気味', emoji: '😴' },
  { value: 'observe', label: '要観察', emoji: '🤒' },
]

interface ConditionFormProps {
  data: ConditionData | null
  onChange: (data: ConditionData) => void
}

export default function ConditionForm({ data, onChange }: ConditionFormProps) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-3">体調・様子</p>
      <div className="flex flex-wrap gap-2">
        {CONDITIONS.map(({ value, label, emoji }) => {
          const selected = data?.overall === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ overall: value })}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]"
              style={{
                background: selected ? '#EFF6FF' : '#FFFFFF',
                border: selected ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                color: selected ? '#3B82F6' : '#475569',
              }}
              aria-pressed={selected}
            >
              {emoji} {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
