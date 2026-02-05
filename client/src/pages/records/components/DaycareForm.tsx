import type { DaycareData } from '@/types/record'

const ACTIVITIES = [
  { value: 'freeplay', label: 'フリープレイ', emoji: '🎾' },
  { value: 'training', label: 'トレーニング', emoji: '📚' },
  { value: 'walk', label: 'お散歩', emoji: '🚶' },
  { value: 'nap', label: 'お昼寝', emoji: '😴' },
  { value: 'socialization', label: '社会化', emoji: '🐕' },
] as const

const TIME_PERIODS = [
  { key: 'morning', label: '朝' },
  { key: 'afternoon', label: '午後' },
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

  const handleMealChange = (period: 'morning' | 'afternoon', value: string) => {
    onChange({
      ...data,
      meal: {
        ...data.meal,
        [period]: value,
      },
    })
  }

  const toggleToilet = (period: 'morning' | 'afternoon', type: 'urination' | 'defecation') => {
    const currentPeriodData = data.toilet?.[period] || { urination: false, defecation: false }
    onChange({
      ...data,
      toilet: {
        ...data.toilet,
        [period]: {
          ...currentPeriodData,
          [type]: !currentPeriodData[type],
        },
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* 今日の活動 */}
      <div className="space-y-3">
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

      {/* ごはん */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
          🍽️ ごはん
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TIME_PERIODS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-muted-foreground mb-1">{label}ごはん</label>
              <input
                type="text"
                value={data.meal?.[key as 'morning' | 'afternoon'] || ''}
                onChange={(e) => handleMealChange(key as 'morning' | 'afternoon', e.target.value)}
                placeholder="例: 完食、半分残した"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* トイレ */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
          🚽 トイレ
        </p>
        <div className="grid grid-cols-2 gap-4">
          {TIME_PERIODS.map(({ key, label }) => {
            const periodKey = key as 'morning' | 'afternoon'
            const periodData = data.toilet?.[periodKey] || { urination: false, defecation: false }
            return (
              <div key={key} className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-2">{label}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleToilet(periodKey, 'urination')}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]"
                    style={{
                      background: periodData.urination ? '#DBEAFE' : '#FFFFFF',
                      border: periodData.urination ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                      color: periodData.urination ? '#3B82F6' : '#475569',
                    }}
                    aria-pressed={periodData.urination}
                  >
                    💧 おしっこ
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleToilet(periodKey, 'defecation')}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]"
                    style={{
                      background: periodData.defecation ? '#FEF3C7' : '#FFFFFF',
                      border: periodData.defecation ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                      color: periodData.defecation ? '#D97706' : '#475569',
                    }}
                    aria-pressed={periodData.defecation}
                  >
                    💩 うんち
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
