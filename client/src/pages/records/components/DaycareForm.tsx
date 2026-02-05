import type { DaycareData } from '@/types/record'

const ACTIVITIES = [
  { value: 'freeplay', label: 'フリープレイ', emoji: '🎾' },
  { value: 'training', label: 'トレーニング', emoji: '📚' },
  { value: 'walk', label: 'お散歩', emoji: '🚶' },
  { value: 'nap', label: 'お昼寝', emoji: '😴' },
  { value: 'socialization', label: '社会化', emoji: '🐕' },
] as const

interface DaycareFormProps {
  data: DaycareData
  onChange: (data: DaycareData) => void
}

export default function DaycareForm({ data, onChange }: DaycareFormProps) {
  const toggleActivity = (value: string) => {
    const activities = data.activities || []
    const next = activities.includes(value)
      ? activities.filter((a) => a !== value)
      : [...activities, value]
    onChange({ ...data, activities: next })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-700">今日の活動</p>
      <div className="flex flex-wrap gap-2">
        {ACTIVITIES.map(({ value, label, emoji }) => {
          const selected = (data.activities || []).includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggleActivity(value)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]"
              style={{
                background: selected ? '#FFF7ED' : '#FFFFFF',
                border: selected ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                color: selected ? '#F97316' : '#475569',
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
