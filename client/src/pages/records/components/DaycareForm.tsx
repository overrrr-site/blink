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

      {/* トイレ記録 */}
      <div className="pt-2">
        <p className="text-sm font-medium text-slate-700 mb-2">トイレ</p>
        <div className="grid grid-cols-2 gap-3">
          {(['morning', 'afternoon'] as const).map((period) => {
            const periodLabel = period === 'morning' ? '午前' : '午後'
            const toilet = data.toilet?.[period] || { urination: false, defecation: false }
            return (
              <div key={period} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">{periodLabel}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...data }
                      if (!updated.toilet) updated.toilet = {}
                      updated.toilet[period] = { ...toilet, urination: !toilet.urination }
                      onChange(updated)
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: toilet.urination ? '#FFF7ED' : '#FFFFFF',
                      border: toilet.urination ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                      color: toilet.urination ? '#F97316' : '#94A3B8',
                    }}
                  >
                    💧 排尿
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...data }
                      if (!updated.toilet) updated.toilet = {}
                      updated.toilet[period] = { ...toilet, defecation: !toilet.defecation }
                      onChange(updated)
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: toilet.defecation ? '#FFF7ED' : '#FFFFFF',
                      border: toilet.defecation ? '1.5px solid #F97316' : '1px solid #E2E8F0',
                      color: toilet.defecation ? '#F97316' : '#94A3B8',
                    }}
                  >
                    💩 排便
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 食事記録 */}
      <div className="pt-2">
        <p className="text-sm font-medium text-slate-700 mb-2">食事</p>
        <div className="grid grid-cols-2 gap-3">
          {(['morning', 'afternoon'] as const).map((period) => {
            const periodLabel = period === 'morning' ? '午前' : '午後'
            return (
              <div key={period}>
                <label className="text-xs text-slate-500 mb-1 block">{periodLabel}</label>
                <input
                  type="text"
                  value={data.meal?.[period] || ''}
                  onChange={(e) => {
                    const updated = { ...data }
                    if (!updated.meal) updated.meal = {}
                    updated.meal[period] = e.target.value
                    onChange(updated)
                  }}
                  placeholder="食事内容"
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
